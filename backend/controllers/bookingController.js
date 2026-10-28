// backend/controllers/bookingController.js
const mongoose = require('mongoose');
const {
  Appointment,
  DoctorProfile,
} = require('../models');

// 1. Get Available Slots (Patient Flow)
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query; // e.g., ?date=2026-11-02

    // Define standard clinic hours for this example
    const allSlots = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM"];

    // Ask MongoDB for appointments that already exist for this doctor on this date
    const bookedAppointments = await Appointment.find({ doctorId, date });
    
    // Extract just the time strings that are taken
    const takenTimeSlots = bookedAppointments.map(app => app.timeSlot);

    // Filter the standard hours to only return times that are NOT taken
    const availableSlots = allSlots.filter(slot => !takenTimeSlots.includes(slot));

    res.status(200).json({ success: true, availableSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Hold a Slot (Pre-Payment) - UPGRADED WITH TRANSACTIONS (Patient Flow)
// 2. Hold a Slot (Pre-Payment) - SCHEMA UPDATED
const holdSlot = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { patientId, doctorId, date, timeSlot } = req.body;

    // 1. Convert your frontend strings ("2026-11-02", "09:00 AM") into real Date objects
    const startAt = new Date(`${date} ${timeSlot}`);
    // Assume a 30-minute appointment to calculate the end time
    const endAt = new Date(startAt.getTime() + 30 * 60000); 
    
    // 2. The new schema requires a Slot ID. Since we are testing locally without the team's cron job, we mock it.
    const mockSlotId = new mongoose.Types.ObjectId();

    // 3. Check if it exists using the new Date field
    const existing = await Appointment.findOne({ doctorId, startAt }).session(session);
    
    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Slot is no longer available" });
    }

    // 4. Create the appointment using the STRICT new schema fields
    const newAppointment = new Appointment({
      patientId,
      doctorId,
      slotId: mockSlotId, // Now required
      startAt: startAt,   // Now required
      endAt: endAt,       // Now required
      status: 'held'
    });

    await newAppointment.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, appointmentId: newAppointment._id });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Confirm Booking (Post-Payment) (Patient Flow)
const confirmBooking = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    // 1. Fetch the document using standard findById
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // 2. Update the status
    appointment.status = 'confirmed';

    // 3. Fulfill the team's strict schema validation requirement: 
    // Video appointments MUST have a roomId when confirmed.
    if (appointment.mode === 'video') {
      appointment.roomId = `room-${Math.random().toString(36).substring(2, 9)}`;
    }

    // 4. Use .save() to trigger all Mongoose hooks and encryption middleware
    await appointment.save();

    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. View Doctor Appointments (Doctor Dashboard Flow)
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

// Export all grouped functions
module.exports = { 
  getAvailableSlots,
  holdSlot,
  confirmBooking,
  getDoctorAppointments 
};