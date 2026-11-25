// backend/models/PatientProfile.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;
const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption;
const ENC_SECRET = process.env.FIELD_ENCRYPTION_SECRET;

const patientProfileSchema = new Schema({
  userId:    { type: ObjectId, ref: 'User', required: true, unique: true },
  dob:       Date,
  gender:    { type: String, enum: ['male', 'female', 'other'] },
  bloodGroup: String,
  address:   { line1: String, city: String, state: String, pincode: String },
  emergencyContact: { name: String, phone: String, relation: String },
  allergies: [{ substance: String, reaction: String, severity: { type: String, enum: ['mild', 'moderate', 'severe'] } }],
  chronicConditions: [String],
  consentGivenAt: Date,
  consentVersion: String,
}, { timestamps: true });

patientProfileSchema.plugin(mongooseFieldEncryption, {
  fields: ['emergencyContact', 'allergies', 'chronicConditions'], secret: ENC_SECRET,
});

module.exports = model('PatientProfile', patientProfileSchema);