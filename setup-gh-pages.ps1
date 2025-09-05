# Setup GitHub Pages for AutoPromote-Secure
Write-Host "Setting up gh-pages branch for AutoPromote-Secure repository..." -ForegroundColor Cyan

# Check if docs directory exists
if (-not (Test-Path -Path "docs")) {
    Write-Host "Creating docs directory..." -ForegroundColor Yellow
    New-Item -Path "docs" -ItemType Directory
}

# Create or update necessary documentation files
Write-Host "Creating documentation files..." -ForegroundColor Yellow

# Save current branch name
$current_branch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch is $current_branch" -ForegroundColor Cyan

# Check if gh-pages branch exists locally
$ghPagesExists = $false
try {
    git show-ref --verify --quiet refs/heads/gh-pages
    $ghPagesExists = $true
    Write-Host "gh-pages branch already exists locally." -ForegroundColor Green
}
catch {
    # Check if gh-pages exists remotely
    try {
        git ls-remote --exit-code --heads origin gh-pages
        Write-Host "gh-pages branch exists remotely. Checking out..." -ForegroundColor Yellow
        git checkout -b gh-pages origin/gh-pages
    }
    catch {
        Write-Host "Creating new gh-pages branch..." -ForegroundColor Yellow
        git checkout --orphan gh-pages
        git rm -rf .
        "# AutoPromote-Secure Documentation" | Out-File -FilePath "README.md" -Encoding utf8
        git add README.md
        git commit -m "Initial gh-pages commit"
    }
}

# Make sure we're on gh-pages branch
git checkout gh-pages

# Copy docs from main branch if needed
if ($current_branch -ne "gh-pages") {
    Write-Host "Copying documentation from $current_branch branch..." -ForegroundColor Yellow
    git checkout $current_branch -- docs/
    
    # Move files from docs folder to root of gh-pages
    Write-Host "Moving documentation files to root..." -ForegroundColor Yellow
    Copy-Item -Path "docs\*" -Destination "." -Recurse -Force
    Remove-Item -Path "docs" -Recurse -Force
}

# Add all changes
git add .
git commit -m "Update documentation on gh-pages branch"

# Push to remote
Write-Host "Force pushing to gh-pages branch..." -ForegroundColor Magenta
git push -f origin gh-pages

# Go back to original branch
git checkout $current_branch

Write-Host "`nDocumentation branch setup complete!" -ForegroundColor Green
Write-Host "Your documentation will be available at:" -ForegroundColor Cyan
Write-Host "https://tibule12.github.io/AutoPromote-Secure/" -ForegroundColor Cyan
Write-Host "`nRemember to:" -ForegroundColor Yellow
Write-Host "1. Go to your repository on GitHub" -ForegroundColor Yellow
Write-Host "2. Click on Settings" -ForegroundColor Yellow
Write-Host "3. Navigate to Pages in the left sidebar" -ForegroundColor Yellow
Write-Host "4. Under 'Source', select 'Deploy from a branch'" -ForegroundColor Yellow
Write-Host "5. Under 'Branch', select 'gh-pages' branch and '/' (root) folder" -ForegroundColor Yellow
Write-Host "6. Click Save" -ForegroundColor Yellow
Write-Host "`nPress any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
