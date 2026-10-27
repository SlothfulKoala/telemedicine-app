// backend/models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DoctorProfile', 
    required: true 
  },
  date: { 
    type: String, // e.g., "2026-11-02"
    required: true 
  },
  timeSlot: { 
    type: String, // e.g., "10:00 AM"
    required: true 
  },
  status: { 
    type: String, 
    enum: ['held', 'confirmed', 'cancelled'], 
    default: 'held' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);