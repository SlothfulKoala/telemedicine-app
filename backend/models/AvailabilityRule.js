// backend/models/AvailabilityRule.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const availabilityRuleSchema = new Schema({
  doctorId:    { type: ObjectId, ref: 'DoctorProfile', required: true, index: true },
  dayOfWeek:   { type: Number, min: 0, max: 6, required: true },
  startTime:   { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  endTime:     { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  slotMins:    { type: Number, required: true },
  mode:        { type: String, enum: ['video', 'in_person'], default: 'video' },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo:   Date,
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

availabilityRuleSchema.index({ doctorId: 1, dayOfWeek: 1, isActive: 1 });

module.exports = model('AvailabilityRule', availabilityRuleSchema);