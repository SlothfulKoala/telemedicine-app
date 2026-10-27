// backend/models/DoctorProfile.js
const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema({
  // Links this profile to the user's registration account
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  specialisation: { 
    type: String, 
    required: true 
  },
  city: { 
    type: String, 
    required: true 
  },
  consultationFee: { 
    type: Number, 
    required: true 
  },
  experienceYears: { 
    type: Number 
  }
});

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);