// backend/models/ChatMessage.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;
const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption;
const ENC_SECRET = process.env.FIELD_ENCRYPTION_SECRET;

const chatMessageSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true },
  senderId:  { type: ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['text', 'file', 'system'], default: 'text' },
  text:      String,
  fileId:    { type: ObjectId, ref: 'HealthRecord' },
  readAt:    Date,
}, { timestamps: true });

chatMessageSchema.plugin(mongooseFieldEncryption, { fields: ['text'], secret: ENC_SECRET });
chatMessageSchema.index({ appointmentId: 1, createdAt: 1 });

module.exports = model('ChatMessage', chatMessageSchema);