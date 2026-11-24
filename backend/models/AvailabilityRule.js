// backend/models/AvailabilityRule.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const customSlotSchema = new Schema({
  startTime:     { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  endTime:       { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  mode:          { type: String, enum: ['video', 'in_person'], default: 'video' },
  restAfterMins: { type: Number, default: 0, min: 0, max: 240 },
  active:        { type: Boolean, default: true },
}, { _id: false });

const availabilityRuleSchema = new Schema({
  doctorId:      { type: ObjectId, ref: 'DoctorProfile', required: true, index: true },
  dayOfWeek:     { type: Number, min: 0, max: 6, required: true },
  startTime:     { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  endTime:       { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  slotMins:      { type: Number, required: true },
  breakMins:     { type: Number, default: 0, min: 0, max: 240 },
  sameForDay:    { type: Boolean, default: true },
  mode:          { type: String, enum: ['video', 'in_person', 'custom'], default: 'video' },
  customSlots:   { type: [customSlotSchema], default: [] },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo:   Date,
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

availabilityRuleSchema.index({ doctorId: 1, dayOfWeek: 1, isActive: 1 });

module.exports = model('AvailabilityRule', availabilityRuleSchema);