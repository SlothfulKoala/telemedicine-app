// backend/server.js
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import the configured Express app
const app = require('./app');

// Create the HTTP server wrapper (essential for Socket.io to sit on top of Express)
const server = http.createServer(app);

// Initialize the Socket.io signaling server engine (for Member 3)
const io = new Server(server, {
  cors: {
    origin: "*", // Allows developer clients to connect during local dev
    methods: ["GET", "POST"]
  }
});

// Pass the 'io' instance to your dedicated signaling logic folder
const initSocketService = require('./services/socketService');
initSocketService(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Telemedicine server is active on http://localhost:${PORT}`);
});
