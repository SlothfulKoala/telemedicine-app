// backend/controllers/doctorController.js
// 1. Use curly braces to extract exactly what you need from the barrel file
const { DoctorProfile, Specialisation } = require('../models'); 

// The Search API (GET)
exports.searchDoctors = async (req, res) => {
  try {
    const { specialisation, city } = req.query;
    const filter = {};

    // 2. City is still a string in the new schema, so regex works perfectly here
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    // 3. Specialisations are now linked ObjectIds, so we must look up the ID first
    if (specialisation) {
      // Find the specialisation document that matches the search text
      const specDoc = await Specialisation.findOne({ 
        name: { $regex: specialisation, $options: 'i' } 
      });
      
      if (specDoc) {
        // If found, filter doctors who have this specialisation ID in their array
        filter.specialisations = specDoc._id;
      } else {
        // If the specialisation doesn't exist at all, return an empty array immediately
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
    }

    // 4. Run the search. Populate the user info AND the specialisation names!
    const doctors = await DoctorProfile.find(filter)
      .populate('userId', 'name email')
      .populate('specialisations', 'name');

    res.status(200).json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Temporary Create API (POST)
exports.createProfile = async (req, res) => {
  try {
    const newProfile = new DoctorProfile(req.body);
    await newProfile.save();
    res.status(201).json({ success: true, data: newProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};