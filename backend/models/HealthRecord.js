// backend/models/HealthRecord.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;
const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption;
const ENC_SECRET = process.env.FIELD_ENCRYPTION_SECRET;

const healthRecordSchema = new Schema({
  patientId:  { type: ObjectId, ref: 'User', required: true },
  uploadedBy: { type: ObjectId, ref: 'User', required: true },
  appointmentId: { type: ObjectId, ref: 'Appointment' },
  prescriptionId: { type: ObjectId, ref: 'Prescription' },
  category: { type: String, enum: ['lab_report', 'imaging', 'prescription', 'discharge_summary', 'vaccination', 'insurance', 'other'], required: true },
  title:    { type: String, required: true },
  notes:    String,
  recordDate: Date,
  file: { key: String, bucket: String, mimeType: String, sizeBytes: Number, sha256: String },
  sharedWith: [{
    doctorId:  { type: ObjectId, ref: 'DoctorProfile' },
    grantedAt: Date,
    expiresAt: Date,
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
}, { timestamps: true });

healthRecordSchema.plugin(mongooseFieldEncryption, { fields: ['notes'], secret: ENC_SECRET });
healthRecordSchema.index({ patientId: 1, recordDate: -1 });
healthRecordSchema.index({ patientId: 1, category: 1 });
healthRecordSchema.index({ 'sharedWith.doctorId': 1, 'sharedWith.expiresAt': 1 });

module.exports = model('HealthRecord', healthRecordSchema);