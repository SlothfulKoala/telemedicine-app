// backend/models/DoctorProfile.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const doctorProfileSchema = new Schema({
  userId:            { type: ObjectId, ref: 'User', required: true, unique: true },
  consultationModes: { type: [String], enum: ['video', 'in_person'], default: ['video'] },
  cancellationPolicy: {
    freeCancelHours:  { type: Number, default: 24 },
    lateRefundPercent: { type: Number, default: 50, min: 0, max: 100 },
    maxReschedules:   { type: Number, default: 2 },
  },
  specialisations: [{ type: ObjectId, ref: 'Specialisation' }],
  qualifications:  [{ degree: String, institute: String, year: Number }],
  regNumber:       { type: String, required: true, unique: true },
  regCouncil:      String,
  experienceYears: Number,
  bio:             String,
  photoUrl:        String,
  languages:       [String],
  city:            { type: String, index: true },
  clinicAddress:   String,
  timezone:        { type: String, default: 'Asia/Kolkata' },
  fee:             { type: Number, required: true, min: 0 },
  currency:        { type: String, default: 'INR' },
  slotMins:        { type: Number, default: 15 },
  bufferMins:      { type: Number, default: 0 },
  advanceBookingDays: { type: Number, default: 30 },
  rating:          { avg: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  nextAvailableAt: { type: Date, index: true },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
  verifiedBy:      { type: ObjectId, ref: 'User' },
  verifiedAt:      Date,
  isAcceptingBookings: { type: Boolean, default: true },
  stats: {
    totalConsults: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
}, { timestamps: true });

doctorProfileSchema.index({ specialisations: 1, city: 1, fee: 1 });
doctorProfileSchema.index({ verificationStatus: 1, isAcceptingBookings: 1, 'rating.avg': -1 });
doctorProfileSchema.index({ bio: 'text' });
doctorProfileSchema.index({ languages: 1 });

module.exports = model('DoctorProfile', doctorProfileSchema);