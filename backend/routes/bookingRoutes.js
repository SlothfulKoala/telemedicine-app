const express = require('express');
const router = express.Router();
const { getDoctorAppointments } = require('../controllers/bookingController');
const {
  authenticate,
  requireRole,
} = require('../middleware/authMiddleware');

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.get(
  '/doctor/appointments',
  authenticate,
  requireRole('doctor'),
  asyncHandler(getDoctorAppointments)
);

module.exports = router;