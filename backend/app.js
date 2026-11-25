// backend/app.js
const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes/entry'); // Centralized entry router

const app = express();

// Global Middlewares
// Global Middlewares
const explicitOrigins = new Set([
  'http://localhost:5173',
  ...(process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

const isAllowedOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (explicitOrigins.has(origin)) return callback(null, true);
  if (
    process.env.NODE_ENV !== 'production' &&
    /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)
  ) {
    return callback(null, true);
  }
  return callback(new Error(`Origin ${origin} not allowed by CORS`));
};

app.locals.allowedOrigins = isAllowedOrigin;

app.use(cors({
  origin: isAllowedOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '20kb' }));

// Mount central API gateway router
app.use('/api', apiRouter);

// Basic fallback route for untracked requests
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Central error handler
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