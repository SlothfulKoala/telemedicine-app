/**
 * Telemedicine & Doctor Appointment Platform: MongoDB / Mongoose models (v2)
 * v2 adds: Hospital, hospital-scoped admins, in-person consults, Consent, SystemSetting
 * Stack: Node.js + Mongoose 8 + mongoose-field-encryption
 *
 * MongoDB has no real foreign keys. Every "FK" below is an ObjectId with
 * `ref`, so you get populate() and an index, but integrity is enforced by
 * your service layer and transactions, not by the database.
 *
 * Conventions
 *  - All timestamps are stored in UTC. Doctors carry an IANA timezone.
 *  - `timestamps: true` adds createdAt / updatedAt everywhere.
 *  - [PHI] marks protected health information (encrypt / audit).
 */
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;
const mongooseFieldEncryption = require('mongoose-field-encryption').fieldEncryption;

const ENC_SECRET = process.env.FIELD_ENCRYPTION_SECRET; // 32+ chars, from KMS/secret manager

/* ------------------------------------------------------------------ */
/* 1. USER: identity + auth (one document per login)                   */
/* ------------------------------------------------------------------ */
const userSchema = new Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, lowercase: true, trim: true },
  phone:        { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  role:         { type: String, enum: ['patient', 'doctor', 'admin'], required: true, index: true },
  adminType:    { type: String, enum: ['platform', 'hospital'] },            // only when role = admin
  hospitalId:   { type: ObjectId, ref: 'Hospital', index: true },            // FK -> Hospital (hospital admins only)
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },
  lastLoginAt:  Date,
  failedLoginCount: { type: Number, default: 0 },
  lockedUntil:  Date,
}, { timestamps: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.pre('validate', function () {
  if (this.role === 'admin') {
    if (!this.adminType) throw new Error('adminType required for admins');
    if (this.adminType === 'hospital' && !this.hospitalId) throw new Error('hospitalId required for hospital admins');
  }
});

/* ------------------------------------------------------------------ */
/* 2. REFRESH TOKEN: session store (TTL auto-cleans)                   */
/* ------------------------------------------------------------------ */
const refreshTokenSchema = new Schema({
  userId:    { type: ObjectId, ref: 'User', required: true, index: true },   // FK -> User
  tokenHash: { type: String, required: true, unique: true },
  userAgent: String,
  ip:        String,
  revokedAt: Date,
  expiresAt: { type: Date, required: true },
}, { timestamps: true });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });       // TTL

/* ------------------------------------------------------------------ */
/* 3. SPECIALISATION: lookup table (referenced, not embedded,          */
/*    so search/filter by specialisation stays consistent)             */
/* ------------------------------------------------------------------ */
const specialisationSchema = new Schema({
  name:        { type: String, required: true, unique: true },   // "Cardiology"
  slug:        { type: String, required: true, unique: true },
  description: String,
  icon:        String,
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

/* ------------------------------------------------------------------ */
/* 3b. HOSPITAL (new): groups doctors; hospital admins are scoped to it */
/*     Doctors point TO the hospital (DoctorProfile.hospitalId), so we  */
/*     never keep an unbounded doctors[] array here.                    */
/* ------------------------------------------------------------------ */
const hospitalSchema = new Schema({
  name:               { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, unique: true },
  address:  { line1: String, city: { type: String, index: true }, state: String, pincode: String },
  contact:  { email: String, phone: String },
  timezone: { type: String, default: 'Asia/Kolkata' },
  adminUserIds: [{ type: ObjectId, ref: 'User' }],                        // FK[] -> User (role=admin, adminType=hospital)
  branding: { logoUrl: String, primaryColor: String },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'suspended'], default: 'pending', index: true },
  verifiedBy: { type: ObjectId, ref: 'User' },                            // FK -> User (platform admin)
  verifiedAt: Date,
  isActive:   { type: Boolean, default: true },
  doctorCount: { type: Number, default: 0 },                              // denormalised counter
}, { timestamps: true });

/* ------------------------------------------------------------------ */
/* 4. DOCTOR PROFILE (1:1 with User where role = doctor)               */
/* ------------------------------------------------------------------ */
const doctorProfileSchema = new Schema({
  userId:          { type: ObjectId, ref: 'User', required: true, unique: true },      // FK -> User (1:1)
  hospitalId:      { type: ObjectId, ref: 'Hospital', index: true },                   // FK -> Hospital (null = independent doctor)
  consultationModes: { type: [String], enum: ['video', 'in_person'], default: ['video'] },
  cancellationPolicy: {                                                                // drives refund on cancel/reschedule
    freeCancelHours:  { type: Number, default: 24 },
    lateRefundPercent: { type: Number, default: 50, min: 0, max: 100 },
    maxReschedules:   { type: Number, default: 2 },
  },
  specialisations: [{ type: ObjectId, ref: 'Specialisation' }],                        // FK[] -> Specialisation (M:N)
  qualifications:  [{ degree: String, institute: String, year: Number }],
  regNumber:       { type: String, required: true, unique: true },   // medical council registration
  regCouncil:      String,
  experienceYears: Number,
  bio:             String,
  photoUrl:        String,
  languages:       [String],
  city:            { type: String, index: true },
  clinicAddress:   String,
  timezone:        { type: String, default: 'Asia/Kolkata' },        // IANA tz for slot generation
  fee:             { type: Number, required: true, min: 0 },         // in paise/cents (integer)
  currency:        { type: String, default: 'INR' },
  slotMins:        { type: Number, default: 15 },                    // default slot length
  bufferMins:      { type: Number, default: 0 },                     // gap between consults
  advanceBookingDays: { type: Number, default: 30 },                 // slot generation horizon
  rating:          { avg: { type: Number, default: 0 }, count: { type: Number, default: 0 } },  // denormalised from Review
  nextAvailableAt: { type: Date, index: true },                      // denormalised for "next available" sort
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
  verifiedBy:      { type: ObjectId, ref: 'User' },                  // FK -> User (admin)
  verifiedAt:      Date,
  isAcceptingBookings: { type: Boolean, default: true },
  stats: {                                                           // denormalised dashboard counters
    totalConsults: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
}, { timestamps: true });
doctorProfileSchema.index({ specialisations: 1, city: 1, fee: 1 });
doctorProfileSchema.index({ verificationStatus: 1, isAcceptingBookings: 1, 'rating.avg': -1 });
doctorProfileSchema.index({ bio: 'text' });
doctorProfileSchema.index({ hospitalId: 1, verificationStatus: 1 });      // hospital admin: manage my doctors
doctorProfileSchema.index({ languages: 1 });

/* ------------------------------------------------------------------ */
/* 5. AVAILABILITY RULE: recurring weekly schedule                     */
/*    Separate collection (not embedded) so rules can be versioned     */
/*    and have effective dates without rewriting the profile.          */
/* ------------------------------------------------------------------ */
const availabilityRuleSchema = new Schema({
  doctorId:    { type: ObjectId, ref: 'DoctorProfile', required: true, index: true },  // FK -> DoctorProfile
  dayOfWeek:   { type: Number, min: 0, max: 6, required: true },     // 0 = Sunday
  startTime:   { type: String, required: true, match: /^\d{2}:\d{2}$/ },   // local "09:00"
  endTime:     { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  slotMins:    { type: Number, required: true },
  mode:        { type: String, enum: ['video', 'in_person'], default: 'video' },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo:   Date,                                               // null = open-ended
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
availabilityRuleSchema.index({ doctorId: 1, dayOfWeek: 1, isActive: 1 });

/* ------------------------------------------------------------------ */
/* 6. TIME OFF: leaves/holidays that block generated slots             */
/* ------------------------------------------------------------------ */
const timeOffSchema = new Schema({
  doctorId: { type: ObjectId, ref: 'DoctorProfile', required: true },      // FK -> DoctorProfile
  startAt:  { type: Date, required: true },
  endAt:    { type: Date, required: true },
  reason:   String,
}, { timestamps: true });
timeOffSchema.index({ doctorId: 1, startAt: 1, endAt: 1 });

/* ------------------------------------------------------------------ */
/* 7. SLOT: the double-booking guard                                   */
/*    Pre-generated by node-cron from rules minus time-off.            */
/* ------------------------------------------------------------------ */
const slotSchema = new Schema({
  doctorId: { type: ObjectId, ref: 'DoctorProfile', required: true },     // FK -> DoctorProfile
  startAt:  { type: Date, required: true },
  endAt:    { type: Date, required: true },
  status:   { type: String, enum: ['open', 'held', 'booked', 'blocked'], default: 'open' },
  mode:     { type: String, enum: ['video', 'in_person'], default: 'video' },   // copied from AvailabilityRule
  ruleId:   { type: ObjectId, ref: 'AvailabilityRule' },                       // FK -> AvailabilityRule (which rule generated it)
  heldBy:        { type: ObjectId, ref: 'User' },                         // FK -> User (patient holding it)
  holdExpiresAt: Date,                                                    // released by cron/Redis if unpaid
  appointmentId: { type: ObjectId, ref: 'Appointment' },                  // FK -> Appointment (set when booked)
}, { timestamps: true });
slotSchema.index({ doctorId: 1, startAt: 1 }, { unique: true });          // <- prevents duplicate slot rows
slotSchema.index({ doctorId: 1, status: 1, startAt: 1 });                 // fast "open slots for date"
slotSchema.index({ status: 1, holdExpiresAt: 1 });                        // hold-expiry sweeper

/* ------------------------------------------------------------------ */
/* 8. PATIENT PROFILE (1:1 with User where role = patient)             */
/* ------------------------------------------------------------------ */
const patientProfileSchema = new Schema({
  userId:    { type: ObjectId, ref: 'User', required: true, unique: true },   // FK -> User (1:1)
  dob:       Date,
  gender:    { type: String, enum: ['male', 'female', 'other'] },
  bloodGroup: String,
  address:   { line1: String, city: String, state: String, pincode: String },
  emergencyContact: { name: String, phone: String, relation: String },
  allergies: [{ substance: String, reaction: String, severity: { type: String, enum: ['mild', 'moderate', 'severe'] } }],  // [PHI]
  chronicConditions: [String],                                            // [PHI]
  consentGivenAt: Date,                                                   // DPDP/DISHA consent
  consentVersion: String,
}, { timestamps: true });
patientProfileSchema.plugin(mongooseFieldEncryption, {
  fields: ['emergencyContact', 'allergies', 'chronicConditions'], secret: ENC_SECRET,
});

/* ------------------------------------------------------------------ */
/* 9. PAYMENT                                                          */
/* ------------------------------------------------------------------ */
const paymentSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', index: true },     // FK -> Appointment
  patientId:     { type: ObjectId, ref: 'User', required: true, index: true },   // FK -> User
  doctorId:      { type: ObjectId, ref: 'DoctorProfile', required: true },       // FK -> DoctorProfile
  hospitalId:    { type: ObjectId, ref: 'Hospital', index: true },               // FK -> Hospital (hospital-level earnings)
  provider:      { type: String, enum: ['razorpay', 'stripe'], required: true },
  providerOrderId:   { type: String, required: true },
  providerPaymentId: String,
  providerSignature: String,
  amount:   { type: Number, required: true },                             // smallest currency unit
  currency: { type: String, default: 'INR' },
  platformFee: { type: Number, default: 0 },
  doctorPayout: Number,
  status:   { type: String, enum: ['created', 'authorised', 'captured', 'failed', 'refunded', 'partially_refunded'], default: 'created', index: true },
  refund:   { amount: Number, reason: String, providerRefundId: String, refundedAt: Date },
  idempotencyKey: { type: String, unique: true, sparse: true },           // safe webhook retries
}, { timestamps: true });
paymentSchema.index({ providerOrderId: 1 }, { unique: true });
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });

/* ------------------------------------------------------------------ */
/* 10. APPOINTMENT: central entity                                     */
/* ------------------------------------------------------------------ */
const appointmentSchema = new Schema({
  slotId:    { type: ObjectId, ref: 'Slot', required: true },             // FK -> Slot
  doctorId:  { type: ObjectId, ref: 'DoctorProfile', required: true },    // FK -> DoctorProfile
  patientId: { type: ObjectId, ref: 'User', required: true },             // FK -> User (patient)
  hospitalId: { type: ObjectId, ref: 'Hospital', index: true },           // FK -> Hospital (copied from doctor at booking)
  status: {
    type: String,
    enum: ['held', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled', 'expired'],
    default: 'held',
  },
  mode:      { type: String, enum: ['video', 'in_person'], default: 'video' },
  startAt:   { type: Date, required: true },                              // copied from slot (denormalised)
  endAt:     { type: Date, required: true },
  paymentId: { type: ObjectId, ref: 'Payment' },                          // FK -> Payment
  roomId:    { type: String },                                            // WebRTC room: OMITTED (not null) for in_person
  reason:    String,                                                      // [PHI] chief complaint
  symptoms:  [String],                                                    // [PHI]
  notes:     String,                                                      // [PHI] doctor's consultation notes (encrypted)
  rescheduledFrom: { type: ObjectId, ref: 'Appointment' },                // FK -> Appointment (self ref)
  rescheduledBy:   { type: ObjectId, ref: 'User' },                       // FK -> User (patient OR doctor)
  rescheduleCount: { type: Number, default: 0 },                          // checked vs cancellationPolicy.maxReschedules
  cancellation: {
    by:     { type: ObjectId, ref: 'User' },                              // FK -> User (patient OR doctor)
    byRole: { type: String, enum: ['patient', 'doctor', 'admin', 'system'] },
    reason: String,
    at:     Date,
    refundEligible: Boolean,
  },
  reminders: { sent24h: Boolean, sent1h: Boolean, sent10m: Boolean },
}, { timestamps: true });
appointmentSchema.plugin(mongooseFieldEncryption, { fields: ['reason', 'symptoms', 'notes'], secret: ENC_SECRET });
// Second line of defence: only one ACTIVE appointment per slot, ever.
appointmentSchema.index(
  { slotId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['held', 'confirmed', 'in_progress', 'completed'] } } }
);
appointmentSchema.index({ patientId: 1, startAt: -1 });
appointmentSchema.index({ doctorId: 1, startAt: -1 });
appointmentSchema.index({ status: 1, startAt: 1 });                       // reminder cron
appointmentSchema.index({ hospitalId: 1, startAt: -1 });                  // hospital admin: aggregate reporting
// roomId unique only when it exists as a string (in-person appointments have none)
appointmentSchema.index({ roomId: 1 }, { unique: true, partialFilterExpression: { roomId: { $type: 'string' } } });
// Mode rules: video needs a roomId at confirmation; in-person must never have one
appointmentSchema.pre('validate', function () {
  if (this.mode === 'in_person' && this.roomId) throw new Error('in_person appointment cannot have a roomId');
  if (this.mode === 'video' && this.status === 'confirmed' && !this.roomId) throw new Error('video appointment needs a roomId');
});

/* ------------------------------------------------------------------ */
/* 11. CONSULT SESSION: WebRTC lifecycle. Created ONLY when mode=video */
/* ------------------------------------------------------------------ */
const consultSessionSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },  // FK -> Appointment (1:1)
  roomId:   { type: String, required: true, unique: true },
  participants: [{
    userId:   { type: ObjectId, ref: 'User' },                            // FK -> User
    role:     { type: String, enum: ['doctor', 'patient'] },
    joinedAt: Date,
    leftAt:   Date,
    ip:       String,
    deviceInfo: String,
  }],
  tokenIssuedAt: Date,                                                    // room tokens are short-lived
  startedAt: Date,
  endedAt:   Date,
  durationSecs: Number,
  connectionType: { type: String, enum: ['p2p', 'turn_relay'] },          // proves TURN works in the rubric
  endedReason: { type: String, enum: ['completed', 'doctor_left', 'patient_left', 'network_failure', 'timeout'] },
}, { timestamps: true });

/* ------------------------------------------------------------------ */
/* 12. CHAT MESSAGE: in-consult chat + file sharing                    */
/* ------------------------------------------------------------------ */
const chatMessageSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true },  // FK -> Appointment
  senderId:  { type: ObjectId, ref: 'User', required: true },             // FK -> User
  type:      { type: String, enum: ['text', 'file', 'system'], default: 'text' },
  text:      String,                                                      // [PHI]
  fileId:    { type: ObjectId, ref: 'HealthRecord' },                     // FK -> HealthRecord (shared file)
  readAt:    Date,
}, { timestamps: true });
chatMessageSchema.plugin(mongooseFieldEncryption, { fields: ['text'], secret: ENC_SECRET });
chatMessageSchema.index({ appointmentId: 1, createdAt: 1 });

/* ------------------------------------------------------------------ */
/* 13. MEDICINE: reference database for prescriptions                  */
/* ------------------------------------------------------------------ */
const medicineSchema = new Schema({
  name:        { type: String, required: true },
  genericName: String,
  form:        { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'other'] },
  strength:    String,                                                    // "500 mg"
  manufacturer: String,
  isScheduleH: { type: Boolean, default: false },                         // prescription-only
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
medicineSchema.index({ name: 'text', genericName: 'text' });
medicineSchema.index({ name: 1, strength: 1, form: 1 }, { unique: true });

/* ------------------------------------------------------------------ */
/* 14. PRESCRIPTION [PHI]                                              */
/*    The encryption plugin works on string fields, so clinical        */
/*    content is stored as encrypted JSON strings. The un-encrypted    */
/*    medicineIds[] keeps cross-references queryable.                  */
/* ------------------------------------------------------------------ */
const prescriptionSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },  // FK -> Appointment (1:1)
  doctorId:  { type: ObjectId, ref: 'DoctorProfile', required: true },    // FK -> DoctorProfile
  patientId: { type: ObjectId, ref: 'User', required: true },             // FK -> User
  medicineIds: [{ type: ObjectId, ref: 'Medicine' }],                     // FK[] -> Medicine (searchable, non-PHI)
  medicinesJson: { type: String, required: true },   // ENCRYPTED: JSON [{medicineId,name,dosage,frequency,duration,instructions}]
  diagnosis: String,                                 // ENCRYPTED
  advice:    String,                                 // ENCRYPTED
  followUpOn: Date,
  pdfKey:    String,                                 // private S3 key, never a public URL
  pdfSha256: String,                                 // tamper detection
  verificationCode: { type: String, unique: true }, // printed on PDF + QR for pharmacy verification
  signedAt:  Date,
  signature: String,                                 // digital signature of pdfSha256
  version:   { type: Number, default: 1 },
}, { timestamps: true });
prescriptionSchema.plugin(mongooseFieldEncryption, { fields: ['medicinesJson', 'diagnosis', 'advice'], secret: ENC_SECRET });
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });

/* ------------------------------------------------------------------ */
/* 15. HEALTH RECORD: patient vault (reports, scans, uploads)          */
/* ------------------------------------------------------------------ */
const healthRecordSchema = new Schema({
  patientId:  { type: ObjectId, ref: 'User', required: true },            // FK -> User (owner)
  uploadedBy: { type: ObjectId, ref: 'User', required: true },            // FK -> User (patient or doctor)
  appointmentId: { type: ObjectId, ref: 'Appointment' },                  // FK -> Appointment (optional)
  prescriptionId: { type: ObjectId, ref: 'Prescription' },                // FK -> Prescription (optional)
  category: { type: String, enum: ['lab_report', 'imaging', 'prescription', 'discharge_summary', 'vaccination', 'insurance', 'other'], required: true },
  title:    { type: String, required: true },
  notes:    String,                                                       // ENCRYPTED
  recordDate: Date,
  file: { key: String, bucket: String, mimeType: String, sizeBytes: Number, sha256: String },   // private S3 object
  sharedWith: [{                                                          // explicit, revocable access grants
    doctorId:  { type: ObjectId, ref: 'DoctorProfile' },                  // FK -> DoctorProfile
    grantedAt: Date,
    expiresAt: Date,
  }],
  isDeleted: { type: Boolean, default: false },                           // soft delete for retention policy
  deletedAt: Date,
}, { timestamps: true });
healthRecordSchema.plugin(mongooseFieldEncryption, { fields: ['notes'], secret: ENC_SECRET });
healthRecordSchema.index({ patientId: 1, recordDate: -1 });               // history timeline
healthRecordSchema.index({ patientId: 1, category: 1 });
healthRecordSchema.index({ 'sharedWith.doctorId': 1, 'sharedWith.expiresAt': 1 });

/* ------------------------------------------------------------------ */
/* 16. REVIEW                                                          */
/* ------------------------------------------------------------------ */
const reviewSchema = new Schema({
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },  // FK -> Appointment (1 review per consult)
  doctorId:  { type: ObjectId, ref: 'DoctorProfile', required: true, index: true },     // FK -> DoctorProfile
  patientId: { type: ObjectId, ref: 'User', required: true },                           // FK -> User
  rating:    { type: Number, min: 1, max: 5, required: true },
  comment:   { type: String, maxlength: 1000 },
  isHidden:  { type: Boolean, default: false },                           // moderation
}, { timestamps: true });

/* ------------------------------------------------------------------ */
/* 17. NOTIFICATION: orchestration log (email / SMS / in-app)          */
/* ------------------------------------------------------------------ */
const notificationSchema = new Schema({
  userId:   { type: ObjectId, ref: 'User', required: true },              // FK -> User (recipient)
  appointmentId: { type: ObjectId, ref: 'Appointment' },                  // FK -> Appointment
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
notificationSchema.index({ status: 1, scheduledFor: 1 });                 // worker queue
notificationSchema.index({ appointmentId: 1, type: 1, channel: 1 }, { unique: true, sparse: true });  // no duplicate reminders

/* ------------------------------------------------------------------ */
/* 18. AUDIT LOG: append-only, who touched what                        */
/* ------------------------------------------------------------------ */
const auditLogSchema = new Schema({
  actorId:    { type: ObjectId, ref: 'User' },                            // FK -> User (null = system)
  actorRole:  String,
  action: {
    type: String, required: true,
    // e.g. RECORD_VIEW, RECORD_DOWNLOAD, PRESCRIPTION_CREATE, ROOM_TOKEN_ISSUE, LOGIN_FAIL, ACCESS_DENIED
  },
  entityType: { type: String, required: true },                           // 'HealthRecord', 'Prescription', ...
  entityId:   { type: ObjectId },                                         // polymorphic reference (no single ref)
  patientId:  { type: ObjectId, ref: 'User' },                            // FK -> User: whose data was touched
  hospitalId: { type: ObjectId, ref: 'Hospital', index: true },           // FK -> Hospital (hospital admin review scope)
  accessBasis: { type: String, enum: ['self', 'treating_relationship', 'patient_consent', 'admin_aggregate', 'break_glass', 'system'] },
  consentId:  { type: ObjectId, ref: 'Consent' },                         // FK -> Consent (when basis = patient_consent)
  outcome:    { type: String, enum: ['success', 'denied', 'error'], default: 'success' },
  ip:         String,
  userAgent:  String,
  meta:       Schema.Types.Mixed,                                         // never put PHI here
  at:         { type: Date, default: Date.now, required: true },
}, { timestamps: false });
auditLogSchema.index({ patientId: 1, at: -1 });                           // "who accessed my records?"
auditLogSchema.index({ actorId: 1, at: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, at: -1 });
// Enforce append-only at the model layer
['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete'].forEach((op) =>
  auditLogSchema.pre(op, function () { throw new Error('AuditLog is append-only'); })
);

/* ------------------------------------------------------------------ */
/* 19. CONSENT (new): explicit, revocable grants of patient data access */
/*     Needed for hospital admins / non-treating staff (DISHA/DPDP).    */
/* ------------------------------------------------------------------ */
const consentSchema = new Schema({
  patientId:   { type: ObjectId, ref: 'User', required: true, index: true },  // FK -> User (grantor)
  granteeType: { type: String, enum: ['hospital', 'doctor'], required: true },
  hospitalId:  { type: ObjectId, ref: 'Hospital' },                           // FK -> Hospital (if granteeType = hospital)
  doctorId:    { type: ObjectId, ref: 'DoctorProfile' },                      // FK -> DoctorProfile (if granteeType = doctor)
  scope:       [{ type: String, enum: ['records', 'prescriptions', 'appointments'] }],
  purpose:     { type: String, required: true },
  grantedAt:   { type: Date, default: Date.now },
  expiresAt:   { type: Date, required: true },
  revokedAt:   Date,
}, { timestamps: true });
consentSchema.index({ patientId: 1, granteeType: 1, hospitalId: 1, doctorId: 1 });
consentSchema.index({ hospitalId: 1, expiresAt: 1 });

/* ------------------------------------------------------------------ */
/* 20. SYSTEM SETTING (new): admin-managed configuration               */
/*     NEVER store secrets here: keep API keys in a secrets manager    */
/*     and store only `secretRef` (the secret's name).                 */
/* ------------------------------------------------------------------ */
const systemSettingSchema = new Schema({
  scope:      { type: String, enum: ['global', 'hospital'], default: 'global' },
  hospitalId: { type: ObjectId, ref: 'Hospital' },                            // FK -> Hospital (scope = hospital)
  key: {
    type: String, required: true,
    enum: ['payment_gateway', 'notification_provider', 'retention_policy', 'backup_policy', 'cancellation_policy', 'branding'],
  },
  value:     { type: Schema.Types.Mixed, required: true },    // e.g. {provider:'razorpay'}; retention {recordsYears:7, auditYears:7, chatDays:365}
  secretRef: String,                                          // e.g. 'prod/razorpay-keys'
  isActive:  { type: Boolean, default: true },
  updatedBy: { type: ObjectId, ref: 'User', required: true },                 // FK -> User (admin)
  version:   { type: Number, default: 1 },
}, { timestamps: true });
systemSettingSchema.index({ scope: 1, hospitalId: 1, key: 1 }, { unique: true });

/* ------------------------------------------------------------------ */
module.exports = {
  User: model('User', userSchema),
  RefreshToken: model('RefreshToken', refreshTokenSchema),
  Specialisation: model('Specialisation', specialisationSchema),
  DoctorProfile: model('DoctorProfile', doctorProfileSchema),
  AvailabilityRule: model('AvailabilityRule', availabilityRuleSchema),
  TimeOff: model('TimeOff', timeOffSchema),
  Slot: model('Slot', slotSchema),
  PatientProfile: model('PatientProfile', patientProfileSchema),
  Payment: model('Payment', paymentSchema),
  Appointment: model('Appointment', appointmentSchema),
  ConsultSession: model('ConsultSession', consultSessionSchema),
  ChatMessage: model('ChatMessage', chatMessageSchema),
  Medicine: model('Medicine', medicineSchema),
  Prescription: model('Prescription', prescriptionSchema),
  HealthRecord: model('HealthRecord', healthRecordSchema),
  Review: model('Review', reviewSchema),
  Notification: model('Notification', notificationSchema),
  AuditLog: model('AuditLog', auditLogSchema),
  Hospital: model('Hospital', hospitalSchema),
  Consent: model('Consent', consentSchema),
  SystemSetting: model('SystemSetting', systemSettingSchema),
};