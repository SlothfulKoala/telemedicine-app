// backend/routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const { searchDoctors } = require('../controllers/doctorController');
const { completeDoctorProfile } = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.get('/search', asyncHandler(searchDoctors));
router.post(
  '/profile',
  authenticate,
  requireRole('doctor'),
  asyncHandler(completeDoctorProfile)
);

module.exports = router;