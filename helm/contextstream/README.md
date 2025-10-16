# ContextStream Helm Chart

This Helm chart deploys ContextStream on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- PV provisioner support in the underlying infrastructure (for PostgreSQL and Redis persistence)

## Installing the Chart

### Quick Start

```bash
# Add the Helm repository (if published)
helm repo add contextstream https://contextstream.github.io/helm-charts
helm repo update

# Install the chart
helm install contextstream contextstream/contextstream \
  --set secrets.OPENAI_API_KEY=your-api-key \
  --set secrets.BETTER_AUTH_SECRET=your-secret \
  --set secrets.NEXTAUTH_SECRET=your-nextauth-secret
```

### Install from Source

```bash
# Clone the repository
git clone https://github.com/jimseiwert/context-stream.git
cd context-stream/helm

# Install the chart
helm install contextstream ./contextstream \
  --set secrets.OPENAI_API_KEY=your-api-key \
  --set secrets.BETTER_AUTH_SECRET=your-secret \
  --set secrets.NEXTAUTH_SECRET=your-nextauth-secret
```

### Using a Custom Values File

Create a `values.yaml` file:

```yaml
image:
  registry: ghcr.io
  repository: jimseiwert/context-stream
  tag: "latest"

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: contextstream.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: contextstream-tls
      hosts:
        - contextstream.example.com

secrets:
  OPENAI_API_KEY: "your-api-key"
  BETTER_AUTH_SECRET: "your-secret"
  NEXTAUTH_SECRET: "your-nextauth-secret"
  GITHUB_CLIENT_ID: "your-github-client-id"
  GITHUB_CLIENT_SECRET: "your-github-client-secret"

postgresql:
  auth:
    password: "secure-password"

redis:
  auth:
    enabled: true
    password: "redis-password"

resources:
  app:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi
  worker:
    limits:
      cpu: 2000m
      memory: 4Gi
    requests:
      cpu: 1000m
      memory: 2Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

Install with custom values:

```bash
helm install contextstream ./contextstream -f values.yaml
```

## Uninstalling the Chart

```bash
helm uninstall contextstream
```

## Configuration

The following table lists the configurable parameters of the ContextStream chart and their default values.

### Global Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount.app` | Number of app replicas | `2` |
| `replicaCount.worker` | Number of worker replicas | `1` |
| `image.registry` | Image registry | `ghcr.io` |
| `image.repository` | Image repository | `jimseiwert/context-stream` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `image.tag` | Image tag | `""` (defaults to Chart.AppVersion) |

### Service Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `service.type` | Kubernetes service type | `ClusterIP` |
| `service.port` | Service port | `3000` |
| `service.targetPort` | Container port | `3000` |

### Ingress Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.hosts` | Ingress hosts configuration | `[{host: contextstream.example.com, paths: [{path: /, pathType: Prefix}]}]` |
| `ingress.tls` | Ingress TLS configuration | `[]` |

### PostgreSQL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL subchart | `true` |
| `postgresql.auth.username` | PostgreSQL username | `contextstream` |
| `postgresql.auth.password` | PostgreSQL password | `changeme` |
| `postgresql.auth.database` | PostgreSQL database | `contextstream` |
| `postgresql.primary.persistence.enabled` | Enable persistence | `true` |
| `postgresql.primary.persistence.size` | Persistence size | `10Gi` |

### Redis Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Enable Redis subchart | `true` |
| `redis.auth.enabled` | Enable Redis authentication | `false` |
| `redis.auth.password` | Redis password | `""` |
| `redis.master.persistence.enabled` | Enable persistence | `true` |
| `redis.master.persistence.size` | Persistence size | `2Gi` |

### External Database

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalDatabase.enabled` | Use external database | `false` |
| `externalDatabase.host` | External database host | `""` |
| `externalDatabase.port` | External database port | `5432` |
| `externalDatabase.username` | External database username | `""` |
| `externalDatabase.password` | External database password | `""` |
| `externalDatabase.database` | External database name | `""` |

### External Redis

| Parameter | Description | Default |
|-----------|-------------|---------|
| `externalRedis.enabled` | Use external Redis | `false` |
| `externalRedis.host` | External Redis host | `""` |
| `externalRedis.port` | External Redis port | `6379` |
| `externalRedis.password` | External Redis password | `""` |

### Autoscaling Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `autoscaling.enabled` | Enable autoscaling | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `2` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization | `80` |
| `autoscaling.targetMemoryUtilizationPercentage` | Target memory utilization | `80` |

## Using External Managed Services

### Using Managed PostgreSQL (e.g., AWS RDS, Google Cloud SQL)

```yaml
postgresql:
  enabled: false

externalDatabase:
  enabled: true
  host: "your-db-host.rds.amazonaws.com"
  port: 5432
  username: "contextstream"
  password: "secure-password"
  database: "contextstream"
```

### Using Managed Redis (e.g., AWS ElastiCache, Google Memorystore)

```yaml
redis:
  enabled: false

externalRedis:
  enabled: true
  host: "your-redis-host.cache.amazonaws.com"
  port: 6379
  password: "redis-password"
```

## Upgrading

```bash
# Upgrade to a new version
helm upgrade contextstream ./contextstream -f values.yaml

# Rollback to previous version
helm rollback contextstream
```

## Troubleshooting

### Check pod status

```bash
kubectl get pods -l app.kubernetes.io/name=contextstream
```

### View logs

```bash
# App logs
kubectl logs -l app.kubernetes.io/component=app -f

# Worker logs
kubectl logs -l app.kubernetes.io/component=worker -f
```

### Check database migrations

```bash
kubectl logs -l app.kubernetes.io/component=app --tail=100 | grep prisma
```

## Support

For issues and questions, please visit: https://github.com/jimseiwert/context-stream/issues
