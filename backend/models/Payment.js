// backend/models/Payment.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const paymentSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', index: true },
  patientId:     { type: ObjectId, ref: 'User', required: true, index: true },
  doctorId:      { type: ObjectId, ref: 'DoctorProfile', required: true },
  provider:      { type: String, enum: ['razorpay', 'stripe'], required: true },
  providerOrderId:   { type: String, required: true },
  providerPaymentId: String,
  providerSignature: String,
  amount:   { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  platformFee: { type: Number, default: 0 },
  doctorPayout: Number,
  status:   { type: String, enum: ['created', 'authorised', 'captured', 'failed', 'refunded', 'partially_refunded'], default: 'created', index: true },
  refund:   { amount: Number, reason: String, providerRefundId: String, refundedAt: Date },
  idempotencyKey: { type: String, unique: true, sparse: true },
}, { timestamps: true });

paymentSchema.index({ providerOrderId: 1 }, { unique: true });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

module.exports = model('Payment', paymentSchema);