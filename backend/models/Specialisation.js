// backend/models/Specialisation.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const specialisationSchema = new Schema({
  name:        { type: String, required: true, unique: true },
  slug:        { type: String, required: true, unique: true },
  description: String,
  icon:        String,
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = model('Specialisation', specialisationSchema);