#!/bin/bash
set -e

echo "🔍 Checking for schema changes before push..."

# Get the list of files being pushed
CHANGED_FILES=$(git diff --name-only HEAD @{push} 2>/dev/null || git diff --name-only HEAD origin/main 2>/dev/null || echo "")

# Check if schema.prisma has changed
if ! echo "$CHANGED_FILES" | grep -q "prisma/schema.prisma"; then
  echo "✓ No schema changes detected"
  exit 0
fi

echo "✨ Schema changes detected in push!"

# Check if there are new migration files being pushed too
if echo "$CHANGED_FILES" | grep -q "prisma/migrations/"; then
  echo "✅ Migration files found - good to go!"
  exit 0
fi

echo ""
echo "⚠️  Schema changed but no migration file found!"
echo ""
echo "🤖 Auto-generating migration..."

# Generate timestamp for migration name
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
MIGRATION_NAME="auto_${TIMESTAMP}"

# Create migration directory
MIGRATION_DIR="prisma/migrations/${TIMESTAMP}_${MIGRATION_NAME}"
mkdir -p "$MIGRATION_DIR"

echo "📝 Generating migration SQL..."

# Use prisma migrate diff to generate migration SQL
# Compare current schema.prisma against the last migration state
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > "$MIGRATION_DIR/migration.sql" 2>/dev/null || {
    echo "⚠️  Could not auto-generate migration"
    echo "Please run manually:"
    echo "  npx prisma migrate dev --name describe_changes"
    exit 1
  }

# Check if migration file has content
if [ ! -s "$MIGRATION_DIR/migration.sql" ]; then
  echo "⚠️  Empty migration generated (no changes detected)"
  rm -rf "$MIGRATION_DIR"
  exit 0
fi

echo "✅ Migration created: $MIGRATION_NAME"
echo ""
echo "📂 Adding migration to commit..."

# Add migration files to the current commit
git add prisma/migrations/

# Amend the current commit to include migration
git commit --amend --no-edit --no-verify

echo "✅ Migration added to commit!"
echo ""
echo "Location: $MIGRATION_DIR/"
echo ""
