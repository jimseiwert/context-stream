#!/bin/bash
set -e

echo "📦 Running database migrations (bundle mode)..."

# Wait a bit to ensure PostgreSQL is ready
sleep 5

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

# Run migrations with direct connection
cd /app
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

echo "✅ Migrations completed"
