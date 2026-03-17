# Production Database Migrations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `drizzle-kit migrate` calls in the production Docker image with a self-contained programmatic migrator, and replace the Helm init-container migration with a proper pre-upgrade Hook Job.

**Architecture:** Bundle a `scripts/migrate.ts` programmatic migration script using `drizzle-orm/postgres-js/migrator` (runtime deps, already in prod image) into a single `scripts/migrate.js` via esbuild during the Docker build. The app entrypoint and Helm chart both reference this bundled script. Helm gains a `migrations.strategy` value that toggles between a Hook Job (best for external DB + multiple replicas) and an init container (fallback for built-in PostgreSQL subchart users).

**Tech Stack:** drizzle-orm, postgres (npm), esbuild (transitive Next.js dep), Helm 3, Kubernetes batch/v1 Job

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `scripts/migrate.ts` | **Create** | Programmatic migrator — reads `DATABASE_URL_DIRECT` or `DATABASE_URL`, runs `drizzle-orm/postgres-js/migrator` |
| `docker/Dockerfile.app` | **Modify** | Bundle `migrate.ts` → `migrate.js` in builder stage; copy to runner stage |
| `scripts/app-entrypoint.sh` | **Modify** | Replace `npx drizzle-kit migrate` → `node scripts/migrate.js` |
| `helm/contextstream/values.yaml` | **Modify** | Add `migrations.strategy: "job"` (default) |
| `helm/contextstream/templates/migration-job.yaml` | **Create** | Helm pre-install/pre-upgrade Hook Job |
| `helm/contextstream/templates/deployment-app.yaml` | **Modify** | Replace hardcoded `run-migrations` init container with conditional block |
| `deploy/kubernetes/migration-job.yaml` | **Create** | Plain K8s Job for users not using Helm |
| `helm/contextstream/README.md` | **Modify** | Add Migrations section covering both strategies |

---

## Chunk 1: Programmatic Migrator Script + Docker Image

### Task 1: Create `scripts/migrate.ts`

**Files:**
- Create: `scripts/migrate.ts`

- [ ] **Step 1: Create the migration script**

Use an async IIFE (immediately-invoked function expression) instead of top-level `await`. This is required because we bundle with `--format=cjs` (compatible with any `package.json` without needing `"type": "module"`), and CJS does not support top-level `await`. esbuild's CJS output injects `__dirname` automatically — that's how we locate the `drizzle/` migrations folder relative to the bundled `scripts/migrate.js`.

```typescript
/**
 * Production database migration script.
 * Uses drizzle-orm's programmatic migrator — no drizzle-kit required at runtime.
 * Bundled by esbuild into scripts/migrate.js (CJS format) during Docker build.
 *
 * Env vars:
 *   DATABASE_URL_DIRECT  Preferred: direct (non-pooled) connection for advisory locks
 *   DATABASE_URL         Fallback: standard connection URL
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

if (!url) {
  console.error("❌ Neither DATABASE_URL_DIRECT nor DATABASE_URL is set");
  process.exit(1);
}

const maskedUrl = url.replace(/:\/\/([^@]*)@/, "://***@");
console.log("📦 Running database migrations...");
console.log(`   Connection: ${maskedUrl}`);

// __dirname is injected by esbuild CJS bundling.
// At runtime: __dirname = /app/scripts, so migrationsFolder = /app/drizzle
const migrationsFolder = path.resolve(__dirname, "../drizzle");

void (async () => {
  const client = postgres(url as string, { max: 1 });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder });
    console.log("   ✓ Migrations applied successfully");
  } catch (err) {
    console.error("   ✗ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
```

- [ ] **Step 2: Confirm runtime dependencies exist in `dependencies` (not `devDependencies`)**

Run: `node -e "const p = require('./package.json'); console.log('drizzle-orm:', p.dependencies['drizzle-orm']); console.log('postgres:', p.dependencies['postgres'])"`

Expected: both print a version string (not `undefined`). These are prod deps so this should pass.

---

### Task 2: Bundle the script in the Docker build

**Files:**
- Modify: `docker/Dockerfile.app`

- [ ] **Step 1: Add esbuild bundling step to the builder stage**

In `docker/Dockerfile.app`, find the builder stage section just before `RUN npm run build`. Add the bundle command AFTER `npm run build` completes (esbuild needs the node_modules to resolve imports):

```dockerfile
# Bundle migration script into a standalone CJS JS file (no node_modules needed at runtime)
# --format=cjs: compatible without "type":"module" in package.json; esbuild injects __dirname
RUN npx esbuild scripts/migrate.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=cjs \
    --outfile=scripts/migrate.js
```

- [ ] **Step 2: Copy the bundled script into the runner stage**

In `docker/Dockerfile.app`, find the runner stage section where files are copied from builder. Add this line after the existing `COPY --from=builder` lines:

```dockerfile
COPY --from=builder /app/scripts/migrate.js ./scripts/migrate.js
```

The runner stage already copies `drizzle/` migrations folder — confirm that line is still present:
```dockerfile
COPY --from=builder /app/drizzle ./drizzle/
```

- [ ] **Step 3: Verify ownership is set correctly**

The runner stage has `RUN chown -R nextjs:nodejs /app` — this runs after all `COPY` statements so the migrate.js file will be covered automatically. No change needed.

---

### Task 3: Update the app entrypoint

**Files:**
- Modify: `scripts/app-entrypoint.sh`

- [ ] **Step 1: Replace the drizzle-kit call with node**

Find line 41 in `scripts/app-entrypoint.sh`:
```sh
if DATABASE_URL="$MIGRATION_URL" npx drizzle-kit migrate; then
```

Replace with:
```sh
if DATABASE_URL="$MIGRATION_URL" node scripts/migrate.js; then
```

The rest of the script (pgbouncer detection, export, exec stdbuf node server.js) stays unchanged.

---

### Task 4: Build and smoke-test the Docker image locally

- [ ] **Step 1: Build the Docker image**

```bash
cd /Users/jimseiwert/repos/context-stream
docker build -f docker/Dockerfile.app -t contextstream-app:test .
```

Expected: Build completes without errors. The esbuild step should produce output like:
```
  scripts/migrate.js  <size>
```

- [ ] **Step 2: Create a test network and start PostgreSQL**

```bash
docker network create cs-test-net

docker run -d --name cs-test-pg \
  --network cs-test-net \
  -e POSTGRES_USER=cs \
  -e POSTGRES_PASSWORD=cs \
  -e POSTGRES_DB=cs \
  pgvector/pgvector:pg16
```

Wait for PostgreSQL to be ready (retries up to 10 times):
```bash
for i in $(seq 1 10); do
  docker exec cs-test-pg pg_isready -U cs && break
  echo "waiting... ($i)"; sleep 2
done
```

- [ ] **Step 3: Start a test Redis container**

```bash
docker run -d --name cs-test-redis \
  --network cs-test-net \
  redis:7-alpine
```

- [ ] **Step 4: Run the container and confirm it starts without crashing**

```bash
docker run --rm \
  --name cs-test-app \
  --network cs-test-net \
  -e DATABASE_URL="postgresql://cs:cs@cs-test-pg:5432/cs" \
  -e REDIS_URL="redis://cs-test-redis:6379" \
  -e BETTER_AUTH_SECRET="test-secret-key-min-32-chars-long!" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  -e NODE_ENV="production" \
  -p 3001:3000 \
  contextstream-app:test
```

Expected output (first few lines):
```
🚀 Starting ContextStream App...
📌 Using DATABASE_URL for migrations (no separate direct URL provided)
📦 Running database migrations...
   Connection: postgresql://***@postgres:5432/cs
   ✓ Migrations applied successfully
✅ Starting Next.js server...
```

The container must NOT crash-loop. If you see `Module not found` or `Cannot find module`, the bundling step failed — re-check Task 2.

- [ ] **Step 5: Clean up test containers and network**

```bash
docker stop cs-test-app cs-test-pg cs-test-redis 2>/dev/null || true
docker rm cs-test-pg cs-test-redis 2>/dev/null || true
docker network rm cs-test-net 2>/dev/null || true
docker rmi contextstream-app:test
```

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate.ts docker/Dockerfile.app scripts/app-entrypoint.sh
git commit -m "fix: replace drizzle-kit with programmatic migrator in production image

drizzle-kit is a devDependency and not present in the production Docker
image standalone output, causing crash-loop on startup. Replace with
drizzle-orm/postgres-js/migrator bundled via esbuild — uses only runtime
dependencies already present in the image."
```

---

## Chunk 2: Helm Hook Job + Plain K8s Job

### Task 5: Add `migrations.strategy` to Helm values

**Files:**
- Modify: `helm/contextstream/values.yaml`

- [ ] **Step 1: Add the migrations block and directUrl field**

In `values.yaml`, add after the `env:` block (around line 127):

```yaml
# Migration strategy
# "job"            - Helm pre-install/pre-upgrade Hook Job (recommended for external DB + multi-replica)
# "init-container" - Init container on app pod (use when running built-in PostgreSQL subchart)
migrations:
  strategy: "job"
```

Also find the `externalDatabase:` block and add `directUrl` after the existing fields:

```yaml
externalDatabase:
  enabled: false
  host: ""
  port: 5432
  username: ""
  password: ""
  database: ""
  directUrl: ""  # Optional: non-pooled URL for migrations (Neon, PgBouncer, Supabase)
```

---

### Task 6: Create the Helm Hook Job template

**Files:**
- Create: `helm/contextstream/templates/migration-job.yaml`

- [ ] **Step 1: Create the file**

```yaml
{{- if eq .Values.migrations.strategy "job" }}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "contextstream.fullname" . }}-migrate
  labels:
    {{- include "contextstream.labels" . | nindent 4 }}
    app.kubernetes.io/component: migrate
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-1"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    metadata:
      labels:
        {{- include "contextstream.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: migrate
    spec:
      restartPolicy: OnFailure
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "contextstream.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      initContainers:
        - name: wait-for-db
          image: busybox:1.35
          command:
            - sh
            - -c
            - |
              until nc -z {{ include "contextstream.postgresql.host" . }} {{ include "contextstream.postgresql.port" . }}; do
                echo "waiting for database..."
                sleep 2
              done
              echo "database is ready"
      containers:
        - name: migrate
          image: "{{ .Values.image.registry }}/{{ .Values.image.repository }}:app-{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          command: ["node", "scripts/migrate.js"]
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          env:
            - name: DATABASE_URL
              value: {{ include "contextstream.database.url" . }}
            {{- if .Values.externalDatabase.directUrl }}
            - name: DATABASE_URL_DIRECT
              value: {{ .Values.externalDatabase.directUrl | quote }}
            {{- end }}
          envFrom:
            - configMapRef:
                name: {{ include "contextstream.fullname" . }}
            - secretRef:
                name: {{ include "contextstream.fullname" . }}
          resources:
            limits:
              cpu: 500m
              memory: 256Mi
            requests:
              cpu: 100m
              memory: 128Mi
{{- end }}
```

---

### Task 7: Update the Helm app deployment init containers

**Files:**
- Modify: `helm/contextstream/templates/deployment-app.yaml`

- [ ] **Step 1: Replace the hardcoded `run-migrations` init container with a conditional block**

Find the `initContainers:` section (lines 34–51). Keep `wait-for-db` and `wait-for-redis` as-is. Replace the `run-migrations` block with:

```yaml
      initContainers:
        - name: wait-for-db
          image: busybox:1.35
          command: ['sh', '-c', 'until nc -z {{ include "contextstream.postgresql.host" . }} {{ include "contextstream.postgresql.port" . }}; do echo waiting for database; sleep 2; done']
        - name: wait-for-redis
          image: busybox:1.35
          command: ['sh', '-c', 'until nc -z {{ include "contextstream.redis.host" . }} {{ include "contextstream.redis.port" . }}; do echo waiting for redis; sleep 2; done']
        {{- if eq .Values.migrations.strategy "init-container" }}
        - name: run-migrations
          image: "{{ .Values.image.registry }}/{{ .Values.image.repository }}:app-{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["node", "scripts/migrate.js"]
          env:
            - name: DATABASE_URL
              value: {{ include "contextstream.database.url" . }}
            {{- if .Values.externalDatabase.directUrl }}
            - name: DATABASE_URL_DIRECT
              value: {{ .Values.externalDatabase.directUrl | quote }}
            {{- end }}
          envFrom:
            - configMapRef:
                name: {{ include "contextstream.fullname" . }}
            - secretRef:
                name: {{ include "contextstream.fullname" . }}
        {{- end }}
```

---

### Task 8: Create the plain Kubernetes migration Job

**Files:**
- Create: `deploy/kubernetes/migration-job.yaml`

- [ ] **Step 1: Create the file**

```yaml
# ContextStream Database Migration Job
#
# Run this job once before deploying or upgrading the application:
#
#   kubectl apply -f deploy/kubernetes/migration-job.yaml
#   kubectl wait --for=condition=complete job/contextstream-migrate --timeout=120s
#   kubectl apply -f deploy/kubernetes/deployment.yaml
#
# IMPORTANT: Update the ConfigMap and Secret names below to match your deployment.
# If you deployed with the plain YAML manifests (deploy/kubernetes/), the names are
# "contextstream-config" and "contextstream-secrets" as shown. If you deployed with
# Helm, the names default to your release name (e.g. "contextstream").
#
# Also update the wait-for-db host to match your PostgreSQL service name.
#
apiVersion: batch/v1
kind: Job
metadata:
  name: contextstream-migrate
  labels:
    app.kubernetes.io/name: contextstream
    app.kubernetes.io/component: migrate
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    metadata:
      labels:
        app.kubernetes.io/name: contextstream
        app.kubernetes.io/component: migrate
    spec:
      restartPolicy: OnFailure
      initContainers:
        - name: wait-for-db
          image: busybox:1.35
          command:
            - sh
            - -c
            - |
              # Update host/port to match your PostgreSQL service name
              until nc -z contextstream-postgresql 5432; do
                echo "waiting for database..."
                sleep 2
              done
              echo "database is ready"
      containers:
        - name: migrate
          image: jimseiwert/context-stream:app-latest
          command: ["node", "scripts/migrate.js"]
          envFrom:
            - configMapRef:
                name: contextstream-config   # Update to match your ConfigMap name
            - secretRef:
                name: contextstream-secrets  # Update to match your Secret name
          resources:
            limits:
              cpu: 500m
              memory: 256Mi
            requests:
              cpu: 100m
              memory: 128Mi
          securityContext:
            runAsNonRoot: true
            runAsUser: 1001
            capabilities:
              drop:
                - ALL
```

---

### Task 9: Commit Helm + K8s changes

- [ ] **Step 1: Commit**

```bash
git add \
  helm/contextstream/values.yaml \
  helm/contextstream/templates/migration-job.yaml \
  helm/contextstream/templates/deployment-app.yaml \
  deploy/kubernetes/migration-job.yaml
git commit -m "feat(helm): add pre-upgrade migration Hook Job

Replace init-container migration (runs on every replica) with a Helm
pre-install/pre-upgrade Hook Job that runs once per deploy. Helm blocks
the rollout until the job completes; failure aborts the upgrade.

migrations.strategy: 'job' (default) - Hook Job, recommended for external DB
migrations.strategy: 'init-container' - init container, for built-in PostgreSQL subchart"
```

---

## Chunk 3: Documentation

### Task 10: Update Helm README with Migrations section

**Files:**
- Modify: `helm/contextstream/README.md`

- [ ] **Step 1: Add a Migrations section**

Read the current README and add the following section after the "Installing the Chart" section and before the Configuration table (or at a logical point):

```markdown
## Database Migrations

ContextStream runs database migrations automatically on every deploy. The strategy is controlled by `migrations.strategy` in `values.yaml`.

### Strategy: `job` (default — recommended)

A Kubernetes `Job` runs as a Helm pre-install/pre-upgrade hook **before** any app pods start. Helm blocks the rollout until the job succeeds. If the migration fails, the upgrade is aborted and your existing pods continue running.

```
helm upgrade contextstream ./contextstream
# Helm runs migration Job → waits → rolls out app pods
```

**When to use:** Any deployment using an external database (Neon, AWS RDS, Cloud SQL, Supabase, etc.) or when running multiple app replicas.

**Not suitable for:** First install with the built-in PostgreSQL subchart — the database doesn't exist yet when the hook job runs. Use `init-container` strategy for that case.

### Strategy: `init-container`

A migration init container runs inside each app pod before the main container starts. Use this when you're running the built-in PostgreSQL subchart (database is provisioned by Helm alongside the app).

```yaml
# values.yaml
migrations:
  strategy: "init-container"
```

**Drizzle uses advisory locks**, so concurrent init containers across replicas are safe — only one migration run will proceed at a time.

### Switching strategies

```bash
# Use Hook Job (external DB, multi-replica)
helm upgrade contextstream ./contextstream --set migrations.strategy=job

# Use init container (built-in PostgreSQL subchart)
helm upgrade contextstream ./contextstream --set migrations.strategy=init-container
```

### Manual migration (plain kubectl)

If you're not using Helm, apply the migration job manually before each deployment:

```bash
kubectl apply -f deploy/kubernetes/migration-job.yaml
kubectl wait --for=condition=complete job/contextstream-migrate --timeout=120s
kubectl apply -f deploy/kubernetes/deployment.yaml
```
```

- [ ] **Step 2: Commit**

```bash
git add helm/contextstream/README.md
git commit -m "docs(helm): document migration strategies for Kubernetes deployment"
```

---

## Final Verification Checklist

Before declaring complete:

- [ ] `docker build` completes with no errors and esbuild step outputs `scripts/migrate.js`
- [ ] Container starts without crash-loop — migration output shows `✓ Migrations applied successfully` before Next.js starts
- [ ] `npx drizzle-kit` does not appear anywhere in production runtime paths: `grep -r "drizzle-kit" scripts/ docker/Dockerfile.app helm/`
- [ ] Helm template renders correctly: `helm template contextstream helm/contextstream/ | grep -A5 "kind: Job"`
- [ ] Plain K8s job YAML is valid: `kubectl apply --dry-run=client -f deploy/kubernetes/migration-job.yaml`
