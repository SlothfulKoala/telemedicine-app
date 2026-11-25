// backend/models/Slot.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const slotSchema = new Schema({
  doctorId: { type: ObjectId, ref: 'DoctorProfile', required: true },
  startAt:  { type: Date, required: true },
  endAt:    { type: Date, required: true },
  status:   { type: String, enum: ['open', 'held', 'booked', 'blocked'], default: 'open' },
  mode:     { type: String, enum: ['video', 'in_person'], default: 'video' },
  ruleId:   { type: ObjectId, ref: 'AvailabilityRule' },
  heldBy:        { type: ObjectId, ref: 'User' },
  holdExpiresAt: Date,
  appointmentId: { type: ObjectId, ref: 'Appointment' },
}, { timestamps: true });

slotSchema.index({ doctorId: 1, startAt: 1 }, { unique: true });
slotSchema.index({ doctorId: 1, status: 1, startAt: 1 });
slotSchema.index({ status: 1, holdExpiresAt: 1 });

module.exports = model('Slot', slotSchema);