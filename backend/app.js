// backend/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRouter = require('./routes/entry'); // Centralized entry router
const app = express();

// Connect to Cloud MongoDB Atlas
connectDB();

// Global Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.FRONTEND_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '20kb' }));


// Mount central API gateway router
app.use('/api', apiRouter);

// Basic fallback route for untracked requests
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});


// Central error handler.
// Log details on the server, not in the public response.
app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    message: 'Internal server error.',
  });
});

module.exports = app;
