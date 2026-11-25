// backend/models/SystemSetting.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const systemSettingSchema = new Schema({
  key: {
    type: String, required: true,
    unique: true,
    enum: ['payment_gateway', 'notification_provider', 'retention_policy', 'backup_policy', 'cancellation_policy'],
  },
  value:     { type: Schema.Types.Mixed, required: true },
  secretRef: String,
  isActive:  { type: Boolean, default: true },
  updatedBy: { type: ObjectId, ref: 'User', required: true },
  version:   { type: Number, default: 1 },
}, { timestamps: true });

module.exports = model('SystemSetting', systemSettingSchema);