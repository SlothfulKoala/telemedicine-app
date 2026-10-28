// backend/models/TimeOff.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const timeOffSchema = new Schema({
  doctorId: { type: ObjectId, ref: 'DoctorProfile', required: true },
  startAt:  { type: Date, required: true },
  endAt:    { type: Date, required: true },
  reason:   String,
}, { timestamps: true });

timeOffSchema.index({ doctorId: 1, startAt: 1, endAt: 1 });

module.exports = model('TimeOff', timeOffSchema);