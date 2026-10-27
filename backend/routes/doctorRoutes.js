// backend/routes/doctorRoutes.js
const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

// Search for doctors: GET /api/doctors/search
router.get('/search', doctorController.searchDoctors);

// Create a doctor (for testing): POST /api/doctors/profile
router.post('/profile', doctorController.createProfile);

module.exports = router;