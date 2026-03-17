#!/bin/bash
set -e

echo "🔍 Checking for schema changes before push..."

# Get the list of files being pushed
CHANGED_FILES=$(git diff --name-only HEAD @{push} 2>/dev/null || git diff --name-only HEAD origin/main 2>/dev/null || echo "")

# Check if Drizzle schema files have changed
if ! echo "$CHANGED_FILES" | grep -q "src/lib/db/schema/"; then
  echo "✓ No schema changes detected"
  exit 0
fi

echo "✨ Schema changes detected in push!"

# Check if there are new migration files being pushed too
if echo "$CHANGED_FILES" | grep -q "drizzle/"; then
  echo "✅ Migration files found - good to go!"
  exit 0
fi

echo ""
echo "⚠️  Schema changed but no migration file found!"
echo ""
echo "🤖 Auto-generating migration..."

echo "📝 Generating migration SQL..."

# Use drizzle-kit to generate migration
npx drizzle-kit generate 2>/dev/null || {
  echo "⚠️  Could not auto-generate migration"
  echo "Please run manually:"
  echo "  npm run db:generate"
  exit 1
}

# Check if any new migration files were created
if ! echo "$CHANGED_FILES" | grep -q "drizzle/"; then
  NEW_MIGRATIONS=$(git diff --name-only HEAD -- drizzle/ 2>/dev/null || echo "")
  if [ -z "$NEW_MIGRATIONS" ]; then
    echo "⚠️  No migration generated (no changes detected)"
    exit 0
  fi
fi

echo "✅ Migration generated"
echo ""
echo "📂 Adding migration to commit..."

# Add migration files to the current commit
git add drizzle/

# Amend the current commit to include migration
git commit --amend --no-edit --no-verify

echo "✅ Migration added to commit!"
echo ""
