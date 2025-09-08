// Create a simple server to test local connectivity
const http = require('http');

// Create a server that responds with a simple message
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'OK',
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  }));
});

// Start the server on port 3001
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
