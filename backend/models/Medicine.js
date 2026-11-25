// backend/models/Medicine.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const medicineSchema = new Schema({
  name:        { type: String, required: true },
  genericName: String,
  form:        { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'other'] },
  strength:    String,
  manufacturer: String,
  isScheduleH: { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

medicineSchema.index({ name: 'text', genericName: 'text' });
medicineSchema.index({ name: 1, strength: 1, form: 1 }, { unique: true });

module.exports = model('Medicine', medicineSchema);