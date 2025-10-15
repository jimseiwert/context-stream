#!/bin/sh
set -e

echo "🚀 Starting ContextStream App..."

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

# Check if migrations are already applied (doesn't require advisory locks)
echo "   Checking migration status..."
MIGRATION_STATUS=$(DATABASE_URL="$MIGRATION_URL" npx prisma migrate status 2>&1 || true)

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
  echo "   ✓ Database schema is already up to date - skipping migration"
else
  echo "   Running migration deploy..."

  # Try to deploy migrations
  if DATABASE_URL="$MIGRATION_URL" npx prisma migrate deploy; then
    echo "   ✓ Migrations deployed successfully"
  else
    # Migration failed - check if it's because another container already ran it
    echo "   ⚠️  Migration deploy failed, verifying schema status..."
    RECHECK_STATUS=$(DATABASE_URL="$MIGRATION_URL" npx prisma migrate status 2>&1 || true)

    if echo "$RECHECK_STATUS" | grep -q "Database schema is up to date"; then
      echo "   ✓ Schema is up to date (likely deployed by another container) - continuing"
    else
      echo "   ✗ Migration failed and schema is not up to date"
      echo "   Last status check output:"
      echo "$RECHECK_STATUS"
      exit 1
    fi
  fi
fi

# Export the URL with pgbouncer=true for the app
export DATABASE_URL="$APP_URL"

# Start the app
echo "✅ Starting Next.js server..."
# Use stdbuf to force line-buffered output for Kubernetes logging
exec stdbuf -oL -eL node server.js
