#!/bin/bash
set -e

echo "🔧 Setting up Git hooks for automatic migrations..."

# Install Husky if not already installed
if ! npm list husky &> /dev/null; then
  echo "📦 Installing Husky..."
  npm install -D husky
fi

# Initialize Husky
echo "🎣 Initializing Husky..."
npx husky install

# Create pre-push hook
echo "📝 Creating pre-push hook..."
npx husky add .husky/pre-push "bash scripts/auto-migrate.sh"

# Make scripts executable
chmod +x scripts/auto-migrate.sh
chmod +x .husky/pre-push

echo "✅ Git hooks setup complete!"
echo ""
echo "How it works:"
echo "  1. Change schema.prisma and run 'npm run db:push' locally"
echo "  2. Commit your changes"
echo "  3. Push to GitHub"
echo "  4. Pre-push hook automatically generates migration"
echo "  5. Railway deploys and runs migrations"
echo ""
echo "No manual migration steps needed! 🎉"
