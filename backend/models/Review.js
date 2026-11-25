// backend/models/Review.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const reviewSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },
  doctorId:  { type: ObjectId, ref: 'DoctorProfile', required: true, index: true },
  patientId: { type: ObjectId, ref: 'User', required: true },
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, maxlength: 1000 },
  isHidden:  { type: Boolean, default: false },
}, { timestamps: true });

module.exports = model('Review', reviewSchema);