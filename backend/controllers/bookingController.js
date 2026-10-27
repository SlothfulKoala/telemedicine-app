const {
  Appointment,
  DoctorProfile,
} = require('../models/model');

async function getDoctorAppointments(req, res) {
  const doctorProfile = await DoctorProfile.findOne({ userId: req.auth.userId })
    .select('_id timezone')
    .lean();

  if (!doctorProfile) {
    return res.status(404).json({
      message: 'Complete your doctor profile to view appointments.',
    });
  }

  const appointments = await Appointment.find({
    doctorId: doctorProfile._id,
    status: 'confirmed',
    startAt: { $gte: new Date() },
  })
    .select('patientId startAt endAt mode status')
    .populate({ path: 'patientId', select: 'name' })
    .sort({ startAt: 1 })
    .limit(100)
    .lean();

  return res.json({
    timezone: doctorProfile.timezone || 'Asia/Kolkata',
    appointments: appointments.map((appointment) => ({
      id: appointment._id.toString(),
      patientName: appointment.patientId?.name || 'Patient',
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      mode: appointment.mode,
      status: appointment.status,
    })),
  });
}

module.exports = { getDoctorAppointments };