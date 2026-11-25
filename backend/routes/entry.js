// backend/routes/entry.js
const express = require('express');
const router = express.Router();

// Import individual route files
const authRoutes = require('./authRoutes');
const bookingRoutes = require('./bookingRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const videoRoutes = require('./videoRoutes');
const doctorRoutes = require('./doctorRoutes');

// Mount routes to specific namespaces
router.use('/auth', authRoutes);         // Handles registration, login, profile updates
router.use('/booking', bookingRoutes);   // [Member 1] Handles search, doctors list, appointments booking
router.use('/schedule', scheduleRoutes); // [Member 2] Handles availability templates, slot generation
router.use('/video', videoRoutes);       // [Member 3] Handles room verification, tokens
router.use('/doctors', doctorRoutes);

// Quick health check endpoint to verify backend is up
router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: "Backend API is online and healthy!" });
});

module.exports = router;
