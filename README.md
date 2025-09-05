# AutoPromote - Secure Version

This is a secure version of the AutoPromote application with proper environment variable handling for Firebase credentials.

## Environment Setup

Copy `.env.example` to `.env` and fill in your Firebase credentials:

```
# Firebase configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key

# Firebase service account (JSON string - escaped)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
```

## Security Improvements

- Firebase Admin SDK credentials are now loaded from environment variables
- No hardcoded credentials in the codebase
- Added `.env` to `.gitignore` to prevent accidental commits of sensitive data

## Deployment

When deploying to services like Render, Heroku, or others, make sure to set the appropriate environment variables in your deployment platform's dashboard.
