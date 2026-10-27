const express = require('express');
const router = express.Router();
const {
  getWeeklySchedule,
  saveWeeklySchedule,
} = require('../controllers/scheduleController');
const {
  authenticate,
  requireRole,
} = require('../middleware/authMiddleware');

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

router.get(
  '/weekly',
  authenticate,
  requireRole('doctor'),
  asyncHandler(getWeeklySchedule)
);
router.put(
  '/weekly',
  authenticate,
  requireRole('doctor'),
  asyncHandler(saveWeeklySchedule)
);

module.exports = router;
