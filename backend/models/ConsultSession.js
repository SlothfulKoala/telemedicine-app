// backend/models/ConsultSession.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const consultSessionSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },
  roomId:   { type: String, required: true, unique: true },
  participants: [{
    userId:   { type: ObjectId, ref: 'User' },
    role:     { type: String, enum: ['doctor', 'patient'] },
    joinedAt: Date,
    leftAt:   Date,
    ip:       String,
    deviceInfo: String,
  }],
  tokenIssuedAt: Date,
  startedAt: Date,
  endedAt:   Date,
  durationSecs: Number,
  connectionType: { type: String, enum: ['p2p', 'turn_relay'] },
  endedReason: { type: String, enum: ['completed', 'doctor_left', 'patient_left', 'network_failure', 'timeout'] },
}, { timestamps: true });

module.exports = model('ConsultSession', consultSessionSchema);