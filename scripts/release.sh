#!/bin/bash
set -e

# Usage: ./scripts/release.sh [minor|patch|major]

VERSION_TYPE=$1
if [ -z "$VERSION_TYPE" ]; then
    echo "Usage: npm run release [minor|patch|major]"
    exit 1
fi

echo "🚀 Starting Release Process ($VERSION_TYPE)..."

# 1. Validation
# Ensure we are on master (or main)
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "master" ] && [ "$BRANCH" != "main" ]; then
  echo "⚠️  Warning: You are on branch '$BRANCH'. Releases should ideally be performed from master or main."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then 
  echo "❌ Error: Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# 2. Run Quality Checks
echo "🧪 Running Lint & Build..."
npm run lint
npm run build

# 3. Bump Version
echo "📦 Bumping Version..."
# npm version updates package.json and creates a git tag
npm version $VERSION_TYPE

# Extract new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New Version: $NEW_VERSION"

# 4. Push
echo "⬆️ Pushing to GitHub..."
git push origin $BRANCH
git push origin "v$NEW_VERSION"

echo "✅ Release v$NEW_VERSION completed successfully!"
echo "   GitHub Actions should now deploy this tag to GitHub Pages."
