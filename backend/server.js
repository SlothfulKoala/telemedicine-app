// backend/server.js
const http = require('http');
const path = require('path');

// 1. Explicitly load environment variables first
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 2. Import the configured Express app AFTER dotenv is loaded
const app = require('./app');

// 3. Create the HTTP server wrapper
const server = http.createServer(app);

// 4. Start the server (Socket.io is fully removed for now to prevent crashes)
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Telemedicine server is active on http://localhost:${PORT}`);
});