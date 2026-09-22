#!/bin/bash
# Push Campus Clash 2D to GitHub

set -e
cd "$(dirname "$0")"

echo "=========================================="
echo "🥊 Pushing Campus Clash 2D to GitHub..."
echo "=========================================="

# Check SSH authentication
echo "Checking GitHub authentication..."
ssh -T git@github.com 2>&1 | grep -q "adityaswaroop1100-jpg" && echo "✅ Authenticated as adityaswaroop1100-jpg" || {
  echo "⚠️ SSH key check warning, proceeding..."
}

# Ensure remote is set
git remote set-url origin git@github.com:adityaswaroop1100-jpg/campus-clash.git

# Push to GitHub
echo "Pushing main branch to origin..."
git push -u origin main

echo ""
echo "🎉 SUCCESS! Pushed to https://github.com/adityaswaroop1100-jpg/campus-clash"
echo "🌐 GitHub Pages will deploy automatically via GitHub Actions at:"
echo "   https://adityaswaroop1100-jpg.github.io/campus-clash/"
echo "=========================================="
