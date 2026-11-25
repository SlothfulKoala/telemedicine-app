const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { issueConsultToken } = require('../controllers/videoController');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/consults/:appointmentId/token', authenticate, asyncHandler(issueConsultToken));

module.exports = router;