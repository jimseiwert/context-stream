// Kubernetes Job Dispatch (Mode 3)
// Creates Kubernetes Job resources for background processing.
// Gated behind the `k8s_dispatch` feature flag.
// Uses raw HTTP requests to the K8s API server with the mounted service-account
// token (in-cluster) or the KUBECONFIG / KUBE_API_SERVER env vars (out-of-cluster).

import { isFeatureEnabled } from "@/lib/config/features";

const DEFAULT_WORKER_IMAGE = "jimseiwert/context-stream:worker-latest";
const DEFAULT_K8S_NAMESPACE = "default";
const SERVICE_ACCOUNT_TOKEN_PATH =
  "/var/run/secrets/kubernetes.io/serviceaccount/token";
const SERVICE_ACCOUNT_CA_PATH =
  "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads the in-cluster service account token from the well-known path.
 * Returns null when running outside a cluster.
 */
async function readServiceAccountToken(): Promise<string | null> {
  try {
    const fs = await import("fs/promises");
    return await fs.readFile(SERVICE_ACCOUNT_TOKEN_PATH, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Resolves the Kubernetes API server base URL.
 * Priority:
 *   1. KUBE_API_SERVER env var (e.g. for out-of-cluster dev)
 *   2. In-cluster: https://kubernetes.default.svc
 */
function resolveApiServer(): string {
  return (
    process.env.KUBE_API_SERVER?.replace(/\/$/, "") ??
    "https://kubernetes.default.svc"
  );
}

/** Namespace for job resources. */
function resolveNamespace(): string {
  return process.env.K8S_NAMESPACE ?? DEFAULT_K8S_NAMESPACE;
}

/**
 * Builds the Authorization header value.
 * Uses KUBE_TOKEN env var (for out-of-cluster) or reads the in-cluster token.
 */
async function resolveAuthHeader(): Promise<string | null> {
  if (process.env.KUBE_TOKEN) {
    return `Bearer ${process.env.KUBE_TOKEN}`;
  }
  const token = await readServiceAccountToken();
  if (token) {
    return `Bearer ${token.trim()}`;
  }
  return null;
}

/**
 * Collects environment variables that should be forwarded to the worker pod.
 * Sensitive values are forwarded from the current process environment.
 */
function buildWorkerEnv(jobId: string): Array<{ name: string; value: string }> {
  const forwardVars = [
    "DATABASE_URL",
    "OPENAI_API_KEY",
    "AZURE_OPENAI_API_KEY",
    "AZURE_OPENAI_ENDPOINT",
    "AZURE_OPENAI_DEPLOYMENT",
    "VERTEX_AI_PROJECT",
    "VERTEX_AI_LOCATION",
    "VERTEX_AI_KEY_FILE",
    "REDIS_URL",
    "DISPATCH_MODE",
  ];

  const envEntries: Array<{ name: string; value: string }> = [
    { name: "JOB_ID", value: jobId },
    // Worker starts in single-job mode when JOB_ID is set
    { name: "WORKER_MODE", value: "single" },
  ];

  for (const varName of forwardVars) {
    const value = process.env[varName];
    if (value) {
      envEntries.push({ name: varName, value });
    }
  }

  return envEntries;
}

/**
 * Builds a Kubernetes Job manifest for the given job ID.
 */
function buildJobManifest(jobId: string, namespace: string): object {
  const workerImage =
    process.env.WORKER_IMAGE ?? DEFAULT_WORKER_IMAGE;

  // Job name must be DNS-compliant: lowercase, max 63 chars per label
  // UUIDs are already lowercase hex + hyphens
  const k8sJobName = `contextstream-job-${jobId}`.slice(0, 63);

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: k8sJobName,
      namespace,
      labels: {
        app: "contextstream-worker",
        "job-id": jobId,
        "managed-by": "contextstream",
      },
    },
    spec: {
      // Automatically delete the Job 24 hours after it finishes
      ttlSecondsAfterFinished: 86400,
      backoffLimit: 0,
      template: {
        metadata: {
          labels: {
            app: "contextstream-worker",
            "job-id": jobId,
          },
        },
        spec: {
          restartPolicy: "Never",
          containers: [
            {
              name: "worker",
              image: workerImage,
              env: buildWorkerEnv(jobId),
              resources: {
                requests: { memory: "512Mi", cpu: "250m" },
                limits: { memory: "2Gi", cpu: "1000m" },
              },
            },
          ],
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a Kubernetes Job resource to process the given ContextStream job ID.
 *
 * Requires `k8s_dispatch` feature flag to be enabled.
 * If the flag is off this function is a no-op.
 *
 * @param jobId - The ContextStream job ID to dispatch
 */
export async function createKubernetesJob(jobId: string): Promise<void> {
  if (!isFeatureEnabled("k8s_dispatch" as never)) {
    console.warn(
      `[K8s] createKubernetesJob called but k8s_dispatch feature is not enabled. ` +
        `Set FEATURE_K8S_DISPATCH=true to enable.`
    );
    return;
  }

  const namespace = resolveNamespace();
  const apiServer = resolveApiServer();
  const authHeader = await resolveAuthHeader();

  const manifest = buildJobManifest(jobId, namespace);
  const url = `${apiServer}/apis/batch/v1/namespaces/${namespace}/jobs`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  console.log(`[K8s] Creating Kubernetes Job for job ${jobId} in namespace ${namespace}...`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(manifest),
      // Disable TLS cert verification for self-signed in-cluster certs when
      // the SERVICE_ACCOUNT_CA_PATH is not provided to Node.js. In production
      // you should mount the CA or set NODE_EXTRA_CA_CERTS.
    });
  } catch (err) {
    throw new Error(
      `[K8s] Network error creating Kubernetes Job for job ${jobId}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new Error(
      `[K8s] Kubernetes API returned ${response.status} ${response.statusText} ` +
        `when creating Job for job ${jobId}: ${body}`
    );
  }

  const created = await response.json();
  console.log(
    `[K8s] Job created: ${(created as { metadata?: { name?: string } }).metadata?.name ?? jobId}`
  );
}

/**
 * Polls the Kubernetes Job status until it reaches a terminal state.
 * This is intended for testing/debugging only — in normal operation the
 * worker pod updates the database directly.
 *
 * @param jobId - The ContextStream job ID
 * @param pollIntervalMs - How often to poll (default 5 seconds)
 * @param timeoutMs - Give up after this many milliseconds (default 10 minutes)
 */
export async function watchKubernetesJob(
  jobId: string,
  pollIntervalMs = 5000,
  timeoutMs = 600_000
): Promise<"succeeded" | "failed" | "timeout"> {
  const namespace = resolveNamespace();
  const apiServer = resolveApiServer();
  const authHeader = await resolveAuthHeader();

  const k8sJobName = `contextstream-job-${jobId}`.slice(0, 63);
  const url = `${apiServer}/apis/batch/v1/namespaces/${namespace}/jobs/${k8sJobName}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch {
      // Network blip — keep polling
      continue;
    }

    if (!response.ok) continue;

    const job = await response.json() as {
      status?: { succeeded?: number; failed?: number };
    };

    const status = job.status ?? {};
    if ((status.succeeded ?? 0) > 0) {
      console.log(`[K8s] Kubernetes Job ${k8sJobName} succeeded`);
      return "succeeded";
    }
    if ((status.failed ?? 0) > 0) {
      console.log(`[K8s] Kubernetes Job ${k8sJobName} failed`);
      return "failed";
    }
  }

  console.warn(`[K8s] Timed out watching Kubernetes Job ${k8sJobName}`);
  return "timeout";
}
