# AutoPromote Troubleshooting Guide

This guide provides solutions for common issues you might encounter when running or deploying the AutoPromote application.

## Firebase Authentication Issues

### Problem: "Firebase App named '[DEFAULT]' already exists"

**Symptoms:**
- Error message when starting the server: `Firebase App named '[DEFAULT]' already exists`

**Solutions:**
1. Check `firebaseAdmin.js` to ensure it has the proper initialization check:
   ```javascript
   if (admin.apps.length === 0) {
     // Initialize Firebase Admin SDK here
   }
   ```

2. Ensure Firebase isn't being initialized in multiple places.

### Problem: "Error parsing Firebase service account from env"

**Symptoms:**
- Error when starting the server related to parsing Firebase service account

**Solutions:**
1. Make sure the `FIREBASE_SERVICE_ACCOUNT` environment variable contains a valid JSON string:
   - The JSON should be on a single line with no line breaks
   - All quotes should be properly escaped if necessary
   - The JSON structure should be complete and valid

2. Verify the format in your .env file:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project",...}
   ```

3. For Render deployment, verify the environment variable in the Render dashboard.

## Module Not Found Errors

### Problem: "Cannot find module './validationMiddleware'"

**Symptoms:**
- Error message: `Cannot find module './validationMiddleware'` or similar

**Solutions:**
1. Verify that `validationMiddleware.js` exists in the root directory.
2. Check for case sensitivity issues in filenames and imports.
3. Make sure all required files are properly included in your deployment.

### Problem: "Cannot find module './promotionService'" or "Cannot find module './optimizationService'"

**Symptoms:**
- Error message about missing service modules

**Solutions:**
1. Ensure both `promotionService.js` and `optimizationService.js` files exist.
2. Check the imports in `contentRoutes.js` match the actual filenames.
3. Verify the files were properly deployed to the production environment.

## Database Connection Issues

### Problem: "Error initializing Firebase Admin"

**Symptoms:**
- Server crashes on startup with Firebase Admin initialization errors

**Solutions:**
1. Check your environment variables:
   ```
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```

2. Verify that your service account has the necessary permissions:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Verify the service account has the correct roles assigned

3. Make sure your Firebase project is active and not disabled.

### Problem: "Permission denied" or "Unauthorized" errors with Firestore

**Symptoms:**
- API calls fail with permission or authentication errors

**Solutions:**
1. Check Firestore security rules in Firebase Console
2. Verify the service account has appropriate database access
3. Check that collection names match between code and database
4. Verify authentication tokens are being correctly passed

## Deployment Issues

### Problem: Application crashes on Render deployment

**Symptoms:**
- Application deploys but crashes immediately
- Error in logs with no specific information

**Solutions:**
1. Check Render logs for specific error messages
2. Verify all environment variables are correctly set in Render dashboard
3. Make sure the Node.js version on Render matches your development environment
4. Verify the build and start commands are correct:
   - Build command: `npm install`
   - Start command: `node server.js`

### Problem: "EADDRINUSE" Error on Startup

**Symptoms:**
- Error message: `EADDRINUSE: address already in use` when starting the server

**Solutions:**
1. Make sure the application uses the port provided by the environment:
   ```javascript
   const PORT = process.env.PORT || 5000;
   ```

2. For local development, check if another process is using the same port:
   ```bash
   # On Windows
   netstat -ano | findstr :5000
   # On macOS/Linux
   lsof -i :5000
   ```

3. Kill the process using the port or change the port number.

## Authentication and Authorization Issues

### Problem: "Invalid token" or "Token expired" errors

**Symptoms:**
- API calls fail with token validation errors
- Users get logged out unexpectedly

**Solutions:**
1. Check the token expiration time in `authRoutes.js`
2. Verify the client is storing and sending the token correctly
3. Check for clock synchronization issues between client and server
4. Ensure the token is being passed in the Authorization header

### Problem: "Admin access required" errors

**Symptoms:**
- Admin API calls fail with permission errors

**Solutions:**
1. Verify the user has admin role in Firebase
2. Check the admin middleware is correctly validating roles
3. Ensure admin claims are properly set in Firebase Auth
4. Verify the admin role check logic in `authMiddleware.js`

## CORS Issues

### Problem: "Access-Control-Allow-Origin" errors

**Symptoms:**
- Browser console shows CORS errors
- API calls fail from frontend applications

**Solutions:**
1. Check CORS configuration in `server.js`:
   ```javascript
   const corsOptions = {
     origin: [
       'http://localhost:3000',
       'https://autopromote-app.vercel.app',
       // Add your frontend URLs here
     ].filter(Boolean),
     credentials: true,
     // other options...
   };
   ```

2. Add any missing frontend URLs to the CORS configuration
3. Verify the request includes appropriate headers
4. For development, ensure you're using the correct port for local frontend

## Performance Issues

### Problem: Slow API responses

**Symptoms:**
- API calls take a long time to complete
- Timeouts on certain requests

**Solutions:**
1. Check for inefficient database queries
2. Add indexes to frequently queried fields in Firestore
3. Implement pagination for large result sets
4. Add caching for frequently accessed data
5. Check for memory leaks or high CPU usage

### Problem: High server resource usage

**Symptoms:**
- High CPU or memory usage on the server
- Application becomes unresponsive under load

**Solutions:**
1. Monitor resource usage with Render's dashboard
2. Look for memory leaks using tools like `heapdump`
3. Optimize database queries and connections
4. Consider scaling up your Render instance if needed

## Input Validation Issues

### Problem: "Validation failed" errors

**Symptoms:**
- API calls fail with validation error messages
- Unexpected data format rejections

**Solutions:**
1. Check the validation middleware for the specific endpoint
2. Verify the client is sending data in the expected format
3. Update validation rules if they're too strict
4. Check for type conversion issues (e.g., string vs number)

## Security Issues

### Problem: Suspicious login attempts

**Symptoms:**
- Multiple failed login attempts from unknown sources
- Unusual access patterns in the logs

**Solutions:**
1. Implement rate limiting for authentication endpoints
2. Add multi-factor authentication for sensitive operations
3. Monitor authentication logs for unusual patterns
4. Consider IP-based restrictions for admin endpoints

## Environment Variable Issues

### Problem: "Undefined" configuration values

**Symptoms:**
- Server logs show undefined values for configuration
- Features dependent on environment variables don't work

**Solutions:**
1. Verify all required environment variables are set
2. Check for typos in environment variable names
3. Ensure environment variables are loaded before use:
   ```javascript
   require('dotenv').config();
   ```
4. Add validation for critical environment variables on startup

## Still Need Help?

If you've tried the solutions above and are still experiencing issues:

1. Check the complete server logs for more detailed error information
2. Review the GitHub repository for recent changes or updates
3. Open an issue on the repository with detailed information about your problem
4. Contact the development team with the specific error messages and steps to reproduce
