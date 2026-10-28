// backend/models/User.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  phone:        { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: ['patient', 'doctor', 'admin'], required: true, index: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  Date,
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil:  Date,
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });

module.exports = model('User', userSchema);