# Docker Configuration for ContextStream

This directory contains Docker-related configuration files for the ContextStream application.

## Files

### init-db.sql
PostgreSQL initialization script that runs automatically when the database container starts for the first time.

**What it does:**
- Enables the `pgvector` extension required for vector similarity search
- Sets timezone to UTC
- Logs initialization status

## Docker Compose Services

The `docker-compose.yml` in the root directory defines the following services:

### postgres
- **Image**: `pgvector/pgvector:pg16`
- **Purpose**: PostgreSQL database with pgvector extension
- **Port**: 5432
- **Volume**: `postgres_data` for persistent storage
- **Health Check**: Ensures database is ready before dependent services start

### redis
- **Image**: `redis:7-alpine`
- **Purpose**: In-memory data store for job queues and caching
- **Port**: 6379
- **Volume**: `redis_data` for persistent storage
- **Health Check**: Ensures Redis is ready

### app
- **Purpose**: Next.js development server
- **Port**: 3000
- **Depends on**: postgres, redis
- **Features**:
  - Hot reloading with volume mounts
  - Automatic Prisma client generation
  - Environment variables from `.env`

### worker
- **Purpose**: Background job processor for scraping and embeddings
- **Depends on**: postgres, redis
- **Features**:
  - Runs Bull queue worker
  - Processes scraping jobs
  - Same codebase as app service

## Environment Variables

Configure services using the `.env` file in the root directory:

```bash
# PostgreSQL
POSTGRES_USER=contextstream
POSTGRES_PASSWORD=changeme
POSTGRES_DB=contextstream
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
APP_PORT=3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
OPENAI_API_KEY=sk-...
```

## Usage

See the root `README.md` or `docs/done/IMPLEMENTATION_COMPLETE.md` for detailed usage instructions.

### Quick Commands

```bash
# Start all services
npm run docker:up

# Start only databases (for local development)
npm run docker:deps

# View logs
npm run docker:logs

# Stop services
npm run docker:down

# Stop and remove volumes (clean slate)
npm run docker:down:volumes
```
