// backend/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// Check slots: GET /api/bookings/slots/651a2b3c...?date=2026-11-02
router.get('/slots/:doctorId', bookingController.getAvailableSlots);

// Hold slot: POST /api/bookings/hold
router.post('/hold', bookingController.holdSlot);

// Confirm slot: POST /api/bookings/confirm
router.post('/confirm', bookingController.confirmBooking);

module.exports = router;