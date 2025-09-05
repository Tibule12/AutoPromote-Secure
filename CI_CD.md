# AutoPromote CI/CD

This document explains how the CI/CD pipeline works for the AutoPromote application.

## GitHub Actions Workflow

The GitHub Actions workflow defined in `.github/workflows/main.yml` automates testing and signals deployments:

1. **Build Job**:
   - Runs on every push to main and pull requests targeting main
   - Tests the code against multiple Node.js versions (16.x, 18.x, 20.x)
   - Installs dependencies
   - Verifies JavaScript syntax

2. **Deploy Job**:
   - Only runs when changes are pushed to the main branch
   - Notifies about deployment to Render
   - Can trigger a Render deploy hook if configured

## Render Deployment

Render is configured to:

1. Watch the GitHub repository for changes
2. Automatically build and deploy when new commits are pushed to the main branch
3. Use environment variables for configuration and secrets

### Manual Deployment

You can also manually trigger a deployment in the Render dashboard:

1. Go to your service in the Render dashboard
2. Click the "Manual Deploy" button
3. Select "Deploy latest commit" or "Clear build cache & deploy"

## Setting Up Deploy Hooks (Optional)

If you want to trigger Render deployments from external sources or GitHub Actions:

1. In your Render dashboard, go to your service
2. Navigate to "Settings"
3. Scroll down to "Deploy Hooks"
4. Create a new deploy hook
5. Add the URL as a secret in your GitHub repository settings:
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: `https://api.render.com/deploy/srv-xxxxxxxxxxxx?key=xxxxxxxx`

Then uncomment the "Trigger Render deploy hook" section in the GitHub Actions workflow.
