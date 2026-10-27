// backend/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();

// Import all functions from the unified controller you saved earlier
const { 
  getAvailableSlots, 
  holdSlot, 
  confirmBooking, 
  getDoctorAppointments 
} = require('../controllers/bookingController');

const {
  authenticate,
  requireRole,
} = require('../middleware/authMiddleware');

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// --- YOUR ROUTES (Patient Booking Flow) ---
// Check slots: GET /api/bookings/slots/:doctorId?date=YYYY-MM-DD
router.get('/slots/:doctorId', asyncHandler(getAvailableSlots));

// Hold slot: POST /api/bookings/hold
router.post('/hold', asyncHandler(holdSlot));

// Confirm slot: POST /api/bookings/confirm
router.post('/confirm', asyncHandler(confirmBooking));

// --- TEAM'S ROUTES (Doctor Dashboard Flow) ---
router.get(
  '/doctor/appointments',
  authenticate,
  requireRole('doctor'),
  asyncHandler(getDoctorAppointments)
);

module.exports = router;