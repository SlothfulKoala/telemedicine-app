// backend/controllers/doctorController.js
const DoctorProfile = require('../models/DoctorProfile');

// 1. The Search API (GET)
exports.searchDoctors = async (req, res) => {
  try {
    // Extract query parameters from the URL
    const { specialisation, city } = req.query;
    
    // Start with an empty filter (which would return all doctors)
    const filter = {};

    // If the frontend sent a specialisation, add a case-insensitive rule to the filter
    if (specialisation) {
      filter.specialisation = { $regex: specialisation, $options: 'i' };
    }
    
    // If the frontend sent a city, add a case-insensitive rule to the filter
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    // Run the search. The .populate() command pulls the doctor's name from the User collection!
    const doctors = await DoctorProfile.find(filter).populate('userId', 'name email');

    res.status(200).json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Temporary Create API (POST) - Just so you can add test data today
exports.createProfile = async (req, res) => {
  try {
    const newProfile = new DoctorProfile(req.body);
    await newProfile.save();
    res.status(201).json({ success: true, data: newProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};