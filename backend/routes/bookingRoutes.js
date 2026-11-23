// backend/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();

const { 
  getAvailableSlots, 
  holdSlot, 
  confirmBooking, 
  getPatientAppointments,
  cancelPatientAppointment,
  getDoctorAppointments,
  getCompletedDoctorAppointments,
  completeDoctorAppointment,
  savePrescription,
} = require('../controllers/bookingController');

const {
  authenticate,
  requireRole,
} = require('../middleware/authMiddleware');

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// Publicly browse slots; all booking mutations are tied to the signed-in patient.
router.get('/slots/:doctorId', asyncHandler(getAvailableSlots));

router.post('/hold', authenticate, requireRole('patient'), asyncHandler(holdSlot));
router.post('/confirm', authenticate, requireRole('patient'), asyncHandler(confirmBooking));
router.get(
  '/patient/appointments',
  authenticate,
  requireRole('patient'),
  asyncHandler(getPatientAppointments)
);
router.post(
  '/patient/appointments/:appointmentId/cancel',
  authenticate,
  requireRole('patient'),
  asyncHandler(cancelPatientAppointment)
);

router.get(
  '/doctor/appointments',
  authenticate,
  requireRole('doctor'),
  asyncHandler(getDoctorAppointments)
);
router.get(
  '/doctor/appointments/completed',
  authenticate,
  requireRole('doctor'),
  asyncHandler(getCompletedDoctorAppointments)
);
router.patch(
  '/doctor/appointments/:appointmentId/complete',
  authenticate,
  requireRole('doctor'),
  asyncHandler(completeDoctorAppointment)
);
router.post(
  '/prescription/:appointmentId',
  authenticate,
  requireRole('doctor'),
  asyncHandler(savePrescription)
);

module.exports = router;