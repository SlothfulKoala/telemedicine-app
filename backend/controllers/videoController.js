const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Appointment, DoctorProfile, ConsultSession, AuditLog } = require('../models');
const { getJwtSecret } = require('../config/auth');

const EARLY_JOIN_MINUTES = 15;
const LATE_GRACE_MINUTES = 30;

async function issueConsultToken(req, res) {
  const { appointmentId } = req.params;
  const { userId, role } = req.auth;

  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID.' });
  }

  const appointment = await Appointment.findById(appointmentId)
    .populate({ path: 'patientId', select: 'name' })
    .populate({
      path: 'doctorId',
      select: 'userId specialisations',
      populate: { path: 'userId', select: 'name' },
    });

  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }

  if (appointment.mode !== 'video' || !appointment.roomId) {
    return res.status(400).json({ success: false, message: 'This is not a video consultation.' });
  }

  if (!['confirmed', 'in_progress'].includes(appointment.status)) {
    return res.status(409).json({
      success: false,
      message: `Cannot join a consultation with status "${appointment.status}".`,
    });
  }

  // Verify caller is either the assigned patient or the assigned doctor
  const isPatient =
    role === 'patient' && appointment.patientId?._id?.toString() === userId;

  let isDoctor = false;
  if (role === 'doctor') {
    const doctorProfile = await DoctorProfile.findOne({ userId }).select('_id').lean();
    isDoctor =
      Boolean(doctorProfile) &&
      appointment.doctorId?._id?.toString() === doctorProfile._id.toString();
  }

  if (!isPatient && !isDoctor) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to join this consultation room.',
    });
  }

  // Enforce scheduling time window
  const now = Date.now();
  const earliestJoin = new Date(appointment.startAt).getTime() - EARLY_JOIN_MINUTES * 60 * 1000;
  const latestJoin = new Date(appointment.endAt).getTime() + LATE_GRACE_MINUTES * 60 * 1000;

  if (now < earliestJoin) {
    return res.status(403).json({
      success: false,
      code: 'TOO_EARLY',
      message: `Room opens ${EARLY_JOIN_MINUTES} minutes before your scheduled time.`,
      startAt: appointment.startAt,
      earliestJoinAt: new Date(earliestJoin),
    });
  }

  if (now > latestJoin) {
    return res.status(403).json({
      success: false,
      code: 'WINDOW_EXPIRED',
      message: 'The consultation window for this appointment has ended.',
    });
  }

  // Ensure ConsultSession record exists
  await ConsultSession.findOneAndUpdate(
    { appointmentId: appointment._id },
    {
      $setOnInsert: {
        appointmentId: appointment._id,
        roomId: appointment.roomId,
      },
      $set: { tokenIssuedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  // Write AuditLog entry
  await AuditLog.create({
    actorId: userId,
    action: 'CONSULT_TOKEN_ISSUED',
    entityType: 'Appointment',
    entityId: appointment._id,
    ip: req.ip,
    at: new Date(),
  });

  const roomToken = jwt.sign(
    {
      purpose: 'webrtc_room',
      sub: userId,
      role: isDoctor ? 'doctor' : 'patient',
      appointmentId: appointment._id.toString(),
      roomId: appointment.roomId,
    },
    getJwtSecret(),
    { expiresIn: '15m' }
  );

  return res.json({
    success: true,
    roomToken,
    roomId: appointment.roomId,
    role: isDoctor ? 'doctor' : 'patient',
    appointment: {
      id: appointment._id,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      doctorName: appointment.doctorId?.userId?.name || 'Doctor',
      patientName: appointment.patientId?.name || 'Patient',
    },
  });
}

module.exports = { issueConsultToken };