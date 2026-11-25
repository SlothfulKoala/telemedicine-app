// backend/server.js
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// 1. Explicitly load environment variables first
require('dotenv').config({ path: path.join(__dirname, '.env') });

// 2. Import DB connector, configured Express app, and Socket.io service AFTER dotenv
const connectDB = require('./config/db');
const app = require('./app');
const initSocketService = require('./services/socketService');

const PORT = process.env.PORT || 5000;

// 3. Wrap Express in an HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: app.locals.allowedOrigins,
    credentials: true,
  },
});

initSocketService(io);

// 4. Connect to MongoDB, then start listening for HTTP + WebSocket traffic
Promise.resolve(connectDB()).then(() => {
  server.listen(PORT, () => {
    console.log(`Telemedicine server is active on http://localhost:${PORT}`);
  });
});