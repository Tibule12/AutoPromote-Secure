# Security Configuration Guide

## Firebase Admin Setup

### Environment Variables
For secure operation, ensure the following environment variables are properly configured:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
FIREBASE_ADMIN_TYPE=service_account
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
FIREBASE_ADMIN_CLIENT_ID=your_client_id
FIREBASE_ADMIN_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_ADMIN_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_ADMIN_CLIENT_X509_CERT_URL=your_cert_url
```

### Private Key Handling
The Firebase Admin SDK private key requires special handling:
- Replace newlines with `\n` in the environment variable
- Never commit the actual private key to the repository
- Use secure environment variable storage in deployment platforms

## Authentication Security

### Token Verification
All protected endpoints must verify tokens using the Firebase Admin SDK:

```javascript
// Example token verification
const admin = require('./firebaseAdminSecure');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

### Admin Role Verification
For admin-only endpoints:

```javascript
const verifyAdmin = async (req, res, next) => {
  try {
    const isAdmin = req.user.admin === true;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Admin access required' });
  }
};
```

## API Security Best Practices

1. **Input Validation** - Use validation middleware for all incoming requests
2. **Rate Limiting** - Implement rate limiting to prevent abuse
3. **Error Handling** - Use secure error handling that doesn't expose sensitive information
4. **HTTPS Only** - Enforce HTTPS for all API communication
5. **Security Headers** - Implement proper security headers (CORS, CSP, etc.)
6. **Logging** - Maintain security logs for audit purposes
