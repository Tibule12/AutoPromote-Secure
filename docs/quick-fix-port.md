# Quick Fix: Port Configuration Issue

If you're seeing the error message in Render logs that mentions detecting an attempt to listen on port 5000 and automatically assigning to $PORT (10000), you need to make the following quick fix:

## Solution: Update server.js

1. Open your `server.js` file
2. Find the line where the port is defined (typically near the top or bottom of the file)
3. Replace:
   ```javascript
   const PORT = 5000;
   ```
   or any hardcoded port value with:
   ```javascript
   const PORT = process.env.PORT || 5000;
   ```

4. Find the line where the server starts listening:
   ```javascript
   app.listen(PORT, () => { ... });
   ```
   and replace it with:
   ```javascript
   app.listen(PORT, '0.0.0.0', () => { 
     console.log(`🚀 Server running on port ${PORT}`);
   });
   ```

5. Save the file and redeploy

## Expected Result

After deploying, the application should use the port provided by Render through the environment variable, resolving the warning message.

## Further Information

For detailed instructions and alternative approaches, see the full [Render Port Configuration Guide](render-port-config.md).
