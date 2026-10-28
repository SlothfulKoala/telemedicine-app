// backend/models/Notification.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const notificationSchema = new Schema({
  userId:   { type: ObjectId, ref: 'User', required: true },
  appointmentId: { type: ObjectId, ref: 'Appointment' },
  channel:  { type: String, enum: ['email', 'sms', 'in_app', 'push'], required: true },
  type:     { type: String, enum: ['booking_confirmed', 'reminder_24h', 'reminder_1h', 'reminder_10m', 'cancelled', 'rescheduled', 'prescription_ready', 'payment_receipt', 'refund'], required: true },
  title:    String,
  body:     String,
  status:   { type: String, enum: ['queued', 'sent', 'delivered', 'failed', 'read'], default: 'queued' },
  providerMessageId: String,
  error:    String,
  scheduledFor: Date,
  sentAt:   Date,
  readAt:   Date,
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ appointmentId: 1, type: 1, channel: 1 }, { unique: true, sparse: true });

module.exports = model('Notification', notificationSchema);