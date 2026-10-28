// backend/models/Prescription.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;
const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption;
const ENC_SECRET = process.env.FIELD_ENCRYPTION_SECRET;

const prescriptionSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },
  doctorId:  { type: ObjectId, ref: 'DoctorProfile', required: true },
  patientId: { type: ObjectId, ref: 'User', required: true },
  medicineIds: [{ type: ObjectId, ref: 'Medicine' }],
  medicinesJson: { type: String, required: true },
  diagnosis: String,
  advice:    String,
  followUpOn: Date,
  pdfKey:    String,
  pdfSha256: String,
  verificationCode: { type: String, unique: true },
  signedAt:  Date,
  signature: String,
  version:   { type: Number, default: 1 },
}, { timestamps: true });

prescriptionSchema.plugin(mongooseFieldEncryption, { fields: ['medicinesJson', 'diagnosis', 'advice'], secret: ENC_SECRET });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = model('Prescription', prescriptionSchema);