// backend/models/AuditLog.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const auditLogSchema = new Schema({
  actorId:    { type: ObjectId, ref: 'User' },
  actorRole:  String,
  action: {
    type: String, required: true,
  },
  entityType: { type: String, required: true },
  entityId:   { type: ObjectId },
  patientId:  { type: ObjectId, ref: 'User' },
  accessBasis: { type: String, enum: ['self', 'treating_relationship', 'patient_grant', 'admin_review', 'break_glass', 'system'] },
  outcome:    { type: String, enum: ['success', 'denied', 'error'], default: 'success' },
  ip:         String,
  userAgent:  String,
  meta:       Schema.Types.Mixed,
  at:         { type: Date, default: Date.now, required: true },
}, { timestamps: false });

auditLogSchema.index({ patientId: 1, at: -1 });
auditLogSchema.index({ actorId: 1, at: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });

['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'].forEach((op) =>
  auditLogSchema.pre(op, function () { throw new Error('AuditLog is append-only'); })
);

module.exports = model('AuditLog', auditLogSchema);