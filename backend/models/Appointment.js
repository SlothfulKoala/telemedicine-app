// backend/models/Appointment.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;
const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption;
const ENC_SECRET = process.env.FIELD_ENCRYPTION_SECRET;

const appointmentSchema = new Schema({
  slotId:    { type: ObjectId, ref: 'Slot', required: true },
  doctorId:  { type: ObjectId, ref: 'DoctorProfile', required: true },
  patientId: { type: ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['held', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled', 'expired'],
    default: 'held',
  },
  mode:      { type: String, enum: ['video', 'in_person'], default: 'video' },
  startAt:   { type: Date, required: true },
  endAt:     { type: Date, required: true },
  paymentId: { type: ObjectId, ref: 'Payment' },
  roomId:    { type: String },
  reason:    String,
  symptoms:  [String],
  notes:     String,
  rescheduledFrom: { type: ObjectId, ref: 'Appointment' },
  rescheduledBy:   { type: ObjectId, ref: 'User' },
  rescheduleCount: { type: Number, default: 0 },
  cancellation: {
    by:     { type: ObjectId, ref: 'User' },
    byRole: { type: String, enum: ['patient', 'doctor', 'admin', 'system'] },
    reason: String,
    at:     Date,
    refundEligible: Boolean,
  },
  reminders: { sent24h: Boolean, sent1h: Boolean, sent10m: Boolean },
}, { timestamps: true });

appointmentSchema.plugin(mongooseFieldEncryption, { fields: ['reason', 'symptoms', 'notes'], secret: ENC_SECRET });

appointmentSchema.index(
  { slotId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['held', 'confirmed', 'in_progress', 'completed'] } } }
);
appointmentSchema.index({ patientId: 1, startAt: -1 });
appointmentSchema.index({ doctorId: 1, startAt: -1 });
appointmentSchema.index({ status: 1, startAt: 1 });
appointmentSchema.index({ roomId: 1 }, { unique: true, partialFilterExpression: { roomId: { $type: 'string' } } });

appointmentSchema.pre('validate', function () {
  if (this.mode === 'in_person' && this.roomId) throw new Error('in_person appointment cannot have a roomId');
  if (this.mode === 'video' && this.status === 'confirmed' && !this.roomId) throw new Error('video appointment needs a roomId');
});

module.exports = model('Appointment', appointmentSchema);