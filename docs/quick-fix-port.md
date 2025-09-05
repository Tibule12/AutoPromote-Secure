# Fixing the Port Configuration Issue on Render

This document provides a quick solution to the port configuration issue detected in the server logs.

## Problem Identified

The server logs show:

```
==> Detected service running on port 10000
==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
```

This indicates a potential mismatch between the port your application is using (10000) and what Render expects.

## Solution

### 1. Update server.js

```javascript
// Find this code in server.js
const port = 10000; // or whatever hardcoded port you have
app.listen(port, () => {
  console.log(`🚀 AutoPromote Server is running on port ${port}`);
  // ...
});

// Replace with this code
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 AutoPromote Server is running on port ${PORT}`);
  // ...
});
```

### 2. Commit and Push the Changes

```bash
git add server.js
git commit -m "Fix: Use PORT environment variable for Render compatibility"
git push
```

### 3. Deploy to Render

The changes will automatically deploy if you have continuous deployment set up. Otherwise, manually deploy from the Render dashboard.

## Expected Result

After deploying, the application should use the port provided by Render through the environment variable, resolving the warning message.

## Further Information

For detailed instructions and alternative approaches, see the full [Render Port Configuration Guide](render-port-config.md).
