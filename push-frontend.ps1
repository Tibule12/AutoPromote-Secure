# This script pushes the frontend files to GitHub Pages

# First, make sure we're in the AutoPromote-Secure directory
Set-Location -Path $PSScriptRoot

# Ensure the api-test.html file is included
if (-not (Test-Path -Path "api-test.html")) {
  Write-Host "Error: api-test.html not found!" -ForegroundColor Red
  exit 1
}

# Create or update gh-pages branch
Write-Host "Creating/updating gh-pages branch..." -ForegroundColor Yellow

# Create a temporary directory
$tempDir = Join-Path -Path $env:TEMP -ChildPath ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null
Copy-Item -Path ".\*" -Destination $tempDir -Recurse -Force

# Switch to gh-pages branch
git checkout gh-pages 2>$null
if ($LASTEXITCODE -ne 0) {
  git checkout -b gh-pages
}

# Remove all files except .git
Get-ChildItem -Path "." -Exclude ".git" | Remove-Item -Recurse -Force

# Copy all files from the temporary directory
Copy-Item -Path "$tempDir\*" -Destination "." -Recurse -Force

# Clean up temporary directory
Remove-Item -Path $tempDir -Recurse -Force

# Commit changes
git add .
git commit -m "Update GitHub Pages frontend with API test page"

# Push to remote
git push origin gh-pages

# Switch back to main branch
git checkout main

Write-Host "Successfully pushed to GitHub Pages!" -ForegroundColor Green
Write-Host "Visit https://tibule12.github.io/AutoPromote-Secure/api-test.html to test the API connection" -ForegroundColor Cyan
