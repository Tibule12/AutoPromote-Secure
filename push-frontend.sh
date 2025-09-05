#!/bin/bash

# This script pushes the frontend files to GitHub Pages

# First, make sure we're in the AutoPromote-Secure directory
cd "$(dirname "$0")"

# Ensure the api-test.html file is included
if [ ! -f "api-test.html" ]; then
  echo "Error: api-test.html not found!"
  exit 1
fi

# Create or update gh-pages branch
echo "Creating/updating gh-pages branch..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cp -r * "$TEMP_DIR"

# Switch to gh-pages branch
git checkout gh-pages || git checkout -b gh-pages

# Remove all files except .git
find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} \;

# Copy all files from the temporary directory
cp -r "$TEMP_DIR"/* .

# Clean up temporary directory
rm -rf "$TEMP_DIR"

# Commit changes
git add .
git commit -m "Update GitHub Pages frontend with API test page"

# Push to remote
git push origin gh-pages

# Switch back to main branch
git checkout main

echo "Successfully pushed to GitHub Pages!"
echo "Visit https://tibule12.github.io/AutoPromote-Secure/api-test.html to test the API connection"
