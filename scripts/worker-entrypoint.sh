#!/bin/sh
set -e

# Force unbuffered output for all commands in this script
exec 1>&1
exec 2>&2

echo "🚀 Starting ContextStream Worker..."

# Determine which connection URL to use for migrations
# DATABASE_URL_DIRECT: Direct connection for migrations (supports advisory locks)
# DATABASE_URL: Pooled connection for app runtime (better scalability)
if [ -n "$DATABASE_URL_DIRECT" ]; then
  MIGRATION_URL="$DATABASE_URL_DIRECT"
  echo "📌 Using DATABASE_URL_DIRECT for migrations"
else
  MIGRATION_URL="$DATABASE_URL"
  echo "📌 Using DATABASE_URL for migrations (no separate direct URL provided)"
fi

# For pooled connections, add pgbouncer=true to disable prepared statements
APP_URL="$DATABASE_URL"
if echo "$DATABASE_URL" | grep -qE '(pooler|:6432)'; then
  echo "📌 Detected pooler connection in DATABASE_URL"

  if ! echo "$APP_URL" | grep -q "pgbouncer=true"; then
    if echo "$APP_URL" | grep -q "?"; then
      APP_URL="${APP_URL}&pgbouncer=true"
    else
      APP_URL="${APP_URL}?pgbouncer=true"
    fi
    echo "   ✓ Added pgbouncer=true for app runtime"
  fi
fi

# Run database migrations with direct connection
echo "📦 Running database migrations..."
echo "   Connection URL: $(echo "$MIGRATION_URL" | sed 's/:\/\/[^@]*@/:\/\/***@/')"

# Run database migrations
if DATABASE_URL="$MIGRATION_URL" npx drizzle-kit migrate; then
  echo "   ✓ Migrations applied successfully"
else
  echo "   ✗ Migration failed"
  exit 1
fi

# Export the URL with pgbouncer=true for the worker
export DATABASE_URL="$APP_URL"

# Start the worker
echo "✅ Starting worker process..."
# Use stdbuf to force line-buffered output for Kubernetes logging
# Run tsx directly (not through npm) to ensure it's PID 1 for proper Kubernetes log capture
exec stdbuf -oL -eL npx tsx src/lib/jobs/worker-entry.ts
