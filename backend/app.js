// backend/app.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRouter = require('./routes/entry'); // Centralized entry router

const app = express();

// Connect to Cloud MongoDB Atlas
connectDB();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Mount central API gateway router
app.use('/api', apiRouter);

// Basic fallback route for untracked requests
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

module.exports = app;
