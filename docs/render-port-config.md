# Render Port Configuration Guide

This guide addresses a common issue with port configuration when deploying the AutoPromote-Secure application on Render.

## Understanding the Issue

When deploying to Render, the platform assigns a specific port through an environment variable, but if your application doesn't correctly use this variable, it might try to use a hardcoded port value, causing connection issues.

## Key Symptoms

1. Your app shows as "Live" in the Render dashboard but the URL isn't responding
2. The Render logs show messages like:
   ```
   2025-09-05 10:42:23 [info] Detected an attempted to listen on port 5000, automatically assigning to $PORT (10000) instead
   ```
3. Your application is trying to bind to a port other than what Render expects

## Solution

### 1. Update Server Code

The proper way to configure your server to work with Render is to modify your `server.js` file to prioritize the `PORT` environment variable:

```javascript
// server.js
const express = require('express');
const app = express();

// Other configuration...

// PORT configuration - always use environment variable with fallback
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

### 2. Verify Render Environment Variable

In your Render dashboard:

1. Go to the service for your application
2. Navigate to "Environment" tab
3. Ensure there is a `PORT` environment variable (Render typically sets this automatically)

### 3. Check Bind Address

Make sure your server is binding to `0.0.0.0` (all available network interfaces) rather than just `localhost` or `127.0.0.1`:

```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

## Testing Locally

To test that your application correctly respects the `PORT` environment variable locally:

### Windows PowerShell
```powershell
$env:PORT=3000; node server.js
```

### macOS/Linux
```bash
PORT=3000 node server.js
```

This should start your server on port 3000, confirming that it correctly uses the environment variable.

## Common Issues and Solutions

### 1. Port Binding Conflict

**Symptom**: Render logs show that your app attempted to listen on a specific port (like 5000).

**Solution**: Update your code to use `process.env.PORT` as shown above.

### 2. Application Crashes on Startup

**Symptom**: The application starts but immediately crashes.

**Solution**: Check your logs for error messages. Common issues include:
- Missing environment variables
- Database connection failures
- Syntax errors in recently added code

### 3. Process Exits Immediately

**Symptom**: Render logs show the process starting and then exiting.

**Solution**: Ensure your server is properly binding and listening to the correct port and address.

## Additional Render Configuration

### 1. Start Command

Ensure your start command in Render is set correctly:

```
node server.js
```

Or if you're using npm scripts:

```
npm start
```

### 2. Health Check Path

Configure a health check path in your Render dashboard:

1. Go to your service settings
2. Under "Health Check Path", enter `/api/health`
3. Save changes

This helps Render determine if your application is running correctly.

## Conclusion

Properly configuring your application to use the environment variable for port binding is essential for successful deployment on Render. By following this guide, you should be able to resolve most port-related issues when deploying to Render.
