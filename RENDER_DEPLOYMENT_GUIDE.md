# Deploying to Render

This guide will help you deploy the AutoPromote-Secure application to Render.

## Prerequisites

1. A [Render](https://render.com) account
2. A Firebase project with Firebase Admin SDK credentials

## Step 1: Prepare Your Environment Variables

You'll need to set up the following environment variables in Render:

- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT`: Your Firebase service account credentials as a JSON string
- `PORT`: Port number (Render sets this automatically)
- `NODE_ENV`: Set to `production`
- Any other environment variables your application uses (e.g., `STRIPE_SECRET_KEY` if applicable)

## Step 2: Set Up a New Web Service in Render

1. Log in to your Render dashboard
2. Click on "New" and select "Web Service"
3. Connect your GitHub repository (https://github.com/Tibule12/AutoPromote-Secure)
4. Configure the service:
   - **Name**: Choose a name for your service (e.g., `autopromote-api`)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Choose an instance type based on your needs (e.g., Free for development, Basic for production)

## Step 3: Configure Environment Variables

1. Scroll down to the "Environment" section
2. Add all the required environment variables:
   - Click "Add Environment Variable"
   - Add each key-value pair
   - For `FIREBASE_SERVICE_ACCOUNT`, you'll need to convert your Firebase service account JSON to a string:
     1. Open your Firebase service account JSON file
     2. Remove all line breaks
     3. Copy the entire JSON as a single line
     4. Paste it as the value for `FIREBASE_SERVICE_ACCOUNT`

## Step 4: Deploy

1. Click "Create Web Service"
2. Render will automatically deploy your application

## Step 5: Verify Deployment

1. Once deployment is complete, click on the URL Render provides
2. Test your API endpoints using a tool like Postman or curl:
   ```
   curl https://your-render-url.onrender.com/api/health
   ```

## Troubleshooting

If you encounter issues during deployment:

1. Check the build and deployment logs in Render
2. Verify your environment variables are set correctly
3. Check for any errors in your application code
4. Make sure your Firebase service account has the necessary permissions
5. Check if your Firebase project's Firestore security rules allow the operations

## Updating Your Application

When you push new changes to your GitHub repository, Render will automatically redeploy your application.

## Advanced Configuration

For more advanced configuration options, refer to the [Render documentation](https://render.com/docs).

## Security Considerations

- Never commit sensitive credentials to your repository
- Always use environment variables for secrets
- Regularly rotate your Firebase service account keys
