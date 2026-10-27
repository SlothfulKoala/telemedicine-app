// backend/controllers/bookingController.js
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

// 1. Get Available Slots
exports.getAvailableSlots = async (req, res) => {
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


// 2. Hold a Slot (Pre-Payment) - UPGRADED WITH TRANSACTIONS
exports.holdSlot = async (req, res) => {
  // 1. Start the isolated database bubble (session)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { patientId, doctorId, date, timeSlot } = req.body;

    // 2. Check if it exists, passing the session to LOCK the query
    const existing = await Appointment.findOne({ doctorId, date, timeSlot }).session(session);
    
    if (existing) {
      // 3. If someone else took it, destroy the bubble and cancel the transaction
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Slot is no longer available" });
    }

    // 4. Create the new appointment
    const newAppointment = new Appointment({
      patientId,
      doctorId,
      date,
      timeSlot,
      status: 'held'
    });

    // 5. Save the appointment INSIDE the bubble
    await newAppointment.save({ session });

    // 6. Everything worked! Finalize the transaction to the database
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, appointmentId: newAppointment._id });
  } catch (error) {
    // If the server crashes mid-process, destroy the bubble to prevent database corruption
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Confirm Booking (Post-Payment)
exports.confirmBooking = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    // Find the held appointment and update its status
    const confirmedAppt = await Appointment.findByIdAndUpdate(
      appointmentId, 
      { status: 'confirmed' }, 
      { new: true } // Returns the updated document
    );

    if (!confirmedAppt) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    res.status(200).json({ success: true, data: confirmedAppt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};