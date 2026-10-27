
const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getCurrentUser,
  completeDoctorProfile,
  logout,
} = require('../controllers/authController');

const {
  authenticate,
  requireRole,
} = require('../middleware/authMiddleware');

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/logout', logout);
router.get('/me', authenticate, asyncHandler(getCurrentUser));
router.post(
  '/doctor-profile',
  authenticate,
  requireRole('doctor'),
  asyncHandler(completeDoctorProfile),
);

router.get(
  '/patient/dashboard',
  authenticate,
  requireRole('patient'),
  (req, res) => {
    res.json({
      message: 'Patient dashboard',
      userId: req.auth.userId,
    });
  }
);

router.get(
  '/doctor/dashboard',
  authenticate,
  requireRole('doctor'),
  (req, res) => {
    res.json({
      message: 'Doctor dashboard',
      userId: req.auth.userId,
    });
  }
);

router.get(
  '/admin/dashboard',
  authenticate,
  requireRole('admin'),
  (req, res) => {
    res.json({
      message: 'Admin dashboard',
      userId: req.auth.userId,
    });
  }
);

module.exports = router;
