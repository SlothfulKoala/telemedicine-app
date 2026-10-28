// backend/models/index.js

module.exports = {
  User: require('./User'),
  RefreshToken: require('./RefreshToken'),
  Specialisation: require('./Specialisation'),
  DoctorProfile: require('./DoctorProfile'),
  AvailabilityRule: require('./AvailabilityRule'),
  TimeOff: require('./TimeOff'),
  Slot: require('./Slot'),
  PatientProfile: require('./PatientProfile'),
  Payment: require('./Payment'),
  Appointment: require('./Appointment'),
  ConsultSession: require('./ConsultSession'),
  ChatMessage: require('./ChatMessage'),
  Medicine: require('./Medicine'),
  Prescription: require('./Prescription'),
  HealthRecord: require('./HealthRecord'),
  Review: require('./Review'),
  Notification: require('./Notification'),
  AuditLog: require('./AuditLog'),
  SystemSetting: require('./SystemSetting'),
};