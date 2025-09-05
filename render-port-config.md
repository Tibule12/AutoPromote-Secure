# Port Configuration for Render Deployment

## Overview
This document provides instructions for properly configuring the port settings for deploying the AutoPromote application on Render.

## Current Configuration
The application is currently configured to run on port 10000 as shown in the server logs:
```
🚀 AutoPromote Server is running on port 10000
```

## Render Port Requirements
Render requires that web services listen on the port specified by the `PORT` environment variable. Render automatically sets this environment variable for your service.

## Fixing Port Configuration

### Option 1: Update server.js
Modify your server.js file to use the PORT environment variable with a fallback:

```javascript
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 AutoPromote Server is running on port ${PORT}`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api/`);
});
```

### Option 2: Set PORT environment variable in Render
If you don't want to change your code, you can configure Render to use port 10000:

1. Go to your Render dashboard
2. Select your AutoPromote web service
3. Go to "Environment" tab
4. Add an environment variable:
   - Key: `PORT`
   - Value: `10000`
5. Click "Save Changes"
6. Redeploy your service

## Verifying the Fix
After implementing either of the options above:

1. Wait for the deployment to complete
2. Check the logs for any port-related warnings
3. Verify the service is accessible at https://autopromote.onrender.com
4. Test the health endpoint at https://autopromote.onrender.com/api/health

## Additional Recommendations
- Always use environment variables for configuration values
- Add proper error handling for JSON parsing to prevent the "Unexpected token" errors
- Consider implementing better error messages for failed login attempts

## Related Documentation
- [Render Web Services Port Binding](https://render.com/docs/web-services#port-binding)
- [Node.js Environment Variables Best Practices](https://nodejs.org/en/learn/getting-started/environment-variables)
