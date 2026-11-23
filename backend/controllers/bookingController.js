const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  Appointment,
  DoctorProfile,
  Payment,
  Prescription,
  Slot,
} = require('../models');
const { localDateTimeToUTC } = require('../services/scheduleGenerator');

const HOLD_DURATION_MS = 15 * 60 * 1000;

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function nextDateString(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function timeLabel(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function returnKnownError(res, error) {
  if (!Number.isInteger(error.statusCode)) {
    throw error;
  }

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
}

async function getAvailableSlots(req, res) {
  const { doctorId } = req.params;
  const { date } = req.query;

  if (!mongoose.isValidObjectId(doctorId)) {
    return res.status(400).json({ success: false, message: 'A valid doctor ID is required.' });
  }
  if (date !== undefined && !validDateString(date)) {
    return res.status(400).json({ success: false, message: 'Date must use YYYY-MM-DD format.' });
  }

  const doctor = await DoctorProfile.findById(doctorId)
    .select('timezone verificationStatus isAcceptingBookings')
    .lean();

  if (!doctor) {
    return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
  }
  if (doctor.verificationStatus !== 'verified' || !doctor.isAcceptingBookings) {
    return res.status(409).json({ success: false, message: 'Doctor is not accepting bookings.' });
  }

  const timezone = doctor.timezone || 'Asia/Kolkata';
  const now = new Date();
  const slotFilter = {
    doctorId,
    $or: [
      { status: 'open' },
      { status: 'held', holdExpiresAt: { $lte: now } },
    ],
  };

  if (date !== undefined) {
    const startAt = localDateTimeToUTC(date, 0, timezone);
    const endAt = localDateTimeToUTC(nextDateString(date), 0, timezone);
    if (!startAt || !endAt) {
      return res.status(400).json({ success: false, message: "Could not resolve that date in the doctor's timezone." });
    }
    slotFilter.startAt = { $gte: startAt, $lt: endAt, $gt: now };
  } else {
    slotFilter.startAt = { $gte: now };
  }

  const slots = await Slot.find(slotFilter)
    .select('_id doctorId startAt endAt mode')
    .sort({ startAt: 1 })
    .limit(date === undefined ? 100 : 300)
    .lean();
  const availableSlots = slots.map(({ _id, doctorId: slotDoctorId, startAt, endAt, mode }) => ({
    _id,
    doctorId: slotDoctorId,
    startAt,
    endAt,
    mode,
    status: 'open',
    startTime: timeLabel(startAt, timezone),
    endTime: timeLabel(endAt, timezone),
  }));

  return res.json({
    success: true,
    count: availableSlots.length,
    timezone,
    data: availableSlots,
    slots: availableSlots,
    availableSlots: availableSlots.map((slot) => timeLabel(slot.startAt, timezone)),
  });
}

async function holdSlot(req, res) {
  const { slotId, doctorId } = req.body || {};
  const patientId = req.auth.userId;

  if (!mongoose.isValidObjectId(slotId)) {
    return res.status(400).json({ success: false, message: 'A valid slot ID is required.' });
  }
  if (doctorId !== undefined && !mongoose.isValidObjectId(doctorId)) {
    return res.status(400).json({ success: false, message: 'A valid doctor ID is required.' });
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const currentSlot = await Slot.findOne({
        _id: slotId,
        ...(doctorId ? { doctorId } : {}),
      }).session(session);

      if (!currentSlot) {
        throw httpError(404, 'Slot not found.');
      }

      const now = new Date();
      if (
        currentSlot.status === 'held' &&
        currentSlot.heldBy?.toString() === patientId &&
        currentSlot.holdExpiresAt > now &&
        currentSlot.appointmentId
      ) {
        const existingAppointment = await Appointment.findOne({
          _id: currentSlot.appointmentId,
          patientId,
          status: 'held',
        }).session(session);

        if (existingAppointment) {
          result = {
            status: 200,
            appointmentId: existingAppointment._id,
            holdExpiresAt: currentSlot.holdExpiresAt,
          };
          return;
        }
      }

      const doctor = await DoctorProfile.findById(currentSlot.doctorId)
        .select('verificationStatus isAcceptingBookings')
        .session(session);
      if (!doctor || doctor.verificationStatus !== 'verified' || !doctor.isAcceptingBookings) {
        throw httpError(409, 'Doctor is not accepting bookings.');
      }
      if (currentSlot.startAt <= now) {
        throw httpError(409, 'This slot has already started.');
      }

      const slot = await Slot.findOneAndUpdate(
        {
          _id: currentSlot._id,
          doctorId: currentSlot.doctorId,
          startAt: { $gt: now },
          $or: [
            { status: 'open' },
            { status: 'held', holdExpiresAt: { $lte: now } },
          ],
        },
        {
          $set: {
            status: 'held',
            heldBy: patientId,
            holdExpiresAt: new Date(now.getTime() + HOLD_DURATION_MS),
          },
        },
        { new: true, session }
      );

      if (!slot) {
        throw httpError(409, 'Slot is no longer available.');
      }

      if (currentSlot.appointmentId) {
        await Appointment.updateOne(
          { _id: currentSlot.appointmentId, status: 'held' },
          { $set: { status: 'expired' } },
          { session }
        );
      }

      const appointment = new Appointment({
        slotId: slot._id,
        doctorId: slot.doctorId,
        patientId,
        startAt: slot.startAt,
        endAt: slot.endAt,
        mode: slot.mode,
        status: 'held',
      });
      await appointment.save({ session });

      slot.appointmentId = appointment._id;
      await slot.save({ session });

      result = {
        status: 201,
        appointmentId: appointment._id,
        holdExpiresAt: slot.holdExpiresAt,
      };
    });

    return res.status(result.status).json({
      success: true,
      appointmentId: result.appointmentId,
      holdExpiresAt: result.holdExpiresAt,
    });
  } catch (error) {
    return returnKnownError(res, error);
  } finally {
    await session.endSession();
  }
}

async function confirmBooking(req, res) {
  const {
    appointmentId,
    doctorId,
    mode,
    paymentMethod,
    reason,
    slotId,
    notes,
  } = req.body || {};
  const patientId = req.auth.userId;

  if (paymentMethod !== 'pay_later') {
    return res.status(400).json({
      success: false,
      message: 'The supported payment method is pay_later.',
    });
  }
  if (
    (slotId !== undefined && !mongoose.isValidObjectId(slotId)) ||
    (appointmentId !== undefined && !mongoose.isValidObjectId(appointmentId)) ||
    (!slotId && !appointmentId)
  ) {
    return res.status(400).json({
      success: false,
      message: 'A valid slot ID or appointment ID is required.',
    });
  }
  if (
    (reason !== undefined && typeof reason !== 'string') ||
    (notes !== undefined && typeof notes !== 'string')
  ) {
    return res.status(400).json({ success: false, message: 'Reason and notes must be strings.' });
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const appointmentFilter = { patientId };
      if (appointmentId) appointmentFilter._id = appointmentId;
      if (slotId) appointmentFilter.slotId = slotId;

      const appointment = await Appointment.findOne(appointmentFilter).session(session);
      if (!appointment) {
        throw httpError(404, 'Appointment not found for this patient.');
      }
      if (doctorId && appointment.doctorId.toString() !== doctorId) {
        throw httpError(400, 'The slot does not belong to the requested doctor.');
      }
      if (!['held', 'confirmed'].includes(appointment.status)) {
        throw httpError(409, 'This appointment can no longer be confirmed.');
      }

      const doctor = await DoctorProfile.findById(appointment.doctorId)
        .select('fee currency verificationStatus isAcceptingBookings')
        .session(session);
      if (!doctor) {
        throw httpError(404, 'Doctor profile not found.');
      }
      if (
        appointment.status === 'held' &&
        (doctor.verificationStatus !== 'verified' || !doctor.isAcceptingBookings)
      ) {
        throw httpError(409, 'Doctor is not accepting bookings.');
      }

      const slot = await Slot.findById(appointment.slotId).session(session);
      if (!slot || slot.doctorId.toString() !== appointment.doctorId.toString()) {
        throw httpError(409, 'The appointment slot is no longer valid.');
      }
      if (mode && mode !== slot.mode) {
        throw httpError(400, 'The requested consultation mode does not match this slot.');
      }

      if (appointment.status === 'held') {
        if (
          slot.status !== 'held' ||
          slot.heldBy?.toString() !== patientId ||
          slot.appointmentId?.toString() !== appointment._id.toString() ||
          !slot.holdExpiresAt ||
          slot.holdExpiresAt <= new Date()
        ) {
          throw httpError(409, 'The slot hold has expired. Please select an available slot again.');
        }
      }

      let payment = await Payment.findOne({ appointmentId: appointment._id }).session(session);
      if (!payment) {
        if (!Number.isSafeInteger(doctor.fee) || doctor.fee < 0) {
          throw httpError(409, "The doctor's consultation fee is not configured correctly.");
        }

        payment = new Payment({
          appointmentId: appointment._id,
          patientId,
          doctorId: doctor._id,
          provider: 'pay_later',
          providerOrderId: `pay_later_${appointment._id.toString()}`,
          paymentMethod: 'pay_later',
          amount: doctor.fee,
          currency: doctor.currency || 'INR',
          status: doctor.fee === 0 ? 'waived' : 'pending',
          idempotencyKey: `pay_later_${appointment._id.toString()}`,
        });
        await payment.save({ session });
      } else if (
        payment.patientId.toString() !== patientId ||
        payment.doctorId.toString() !== doctor._id.toString()
      ) {
        throw httpError(409, 'Payment details do not match this appointment.');
      } else if (
        payment.status !== 'captured' &&
        !(
          payment.provider === 'pay_later' &&
          payment.paymentMethod === 'pay_later' &&
          ['pending', 'waived'].includes(payment.status)
        )
      ) {
        throw httpError(409, 'The existing payment cannot be confirmed using Pay Later.');
      }

      appointment.status = 'confirmed';
      appointment.mode = slot.mode;
      appointment.paymentId = payment._id;
      if (reason !== undefined) appointment.reason = reason;
      if (notes !== undefined) appointment.notes = notes;
      if (slot.mode === 'video' && !appointment.roomId) {
        appointment.roomId = `room-${crypto.randomBytes(16).toString('hex')}`;
      }
      await appointment.save({ session });

      if (slot.status !== 'booked') {
        slot.status = 'booked';
        slot.heldBy = undefined;
        slot.holdExpiresAt = undefined;
        slot.appointmentId = appointment._id;
        await slot.save({ session });
      }

      result = { appointment, payment };
    });

    return res.json({
      success: true,
      data: result.appointment,
      payment: {
        id: result.payment._id,
        method: result.payment.paymentMethod,
        status: result.payment.status,
        amount: result.payment.amount,
        currency: result.payment.currency,
      },
    });
  } catch (error) {
    return returnKnownError(res, error);
  } finally {
    await session.endSession();
  }
}

async function getPatientAppointments(req, res) {
  const appointments = await Appointment.find({
    patientId: req.auth.userId,
    status: { $nin: ['held', 'expired'] },
  })
    .select('doctorId startAt endAt mode status reason createdAt')
    .populate({
      path: 'doctorId',
      select: 'userId specialisations',
      populate: [
        { path: 'userId', select: 'name' },
        { path: 'specialisations', select: 'name' },
      ],
    })
    .sort({ startAt: 1 })
    .limit(100)
    .lean();

  const data = appointments.map((appointment) => ({
    ...appointment,
    date: appointment.startAt,
    slotTime: appointment.startAt
      ? timeLabel(appointment.startAt, 'Asia/Kolkata')
      : undefined,
  }));

  return res.json({ success: true, count: data.length, data, appointments: data });
}

async function cancelPatientAppointment(req, res) {
  const { appointmentId } = req.params;
  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({ success: false, message: 'A valid appointment ID is required.' });
  }

  const session = await mongoose.startSession();
  let cancelledAppointment;

  try {
    await session.withTransaction(async () => {
      const appointment = await Appointment.findOne({
        _id: appointmentId,
        patientId: req.auth.userId,
      }).session(session);

      if (!appointment) {
        throw httpError(404, 'Appointment not found.');
      }
      if (appointment.status !== 'confirmed') {
        throw httpError(409, 'Only confirmed appointments can be cancelled.');
      }
      if (appointment.startAt <= new Date()) {
        throw httpError(409, 'An appointment cannot be cancelled after it has started.');
      }

      const payment = await Payment.findOne({ appointmentId: appointment._id }).session(session);
      if (payment?.status === 'captured') {
        throw httpError(409, 'This appointment has a captured payment and cannot be cancelled online.');
      }

      const slot = await Slot.findOne({
        _id: appointment.slotId,
        doctorId: appointment.doctorId,
        appointmentId: appointment._id,
        status: 'booked',
      }).session(session);
      if (!slot) {
        throw httpError(409, 'The appointment slot is no longer available for cancellation.');
      }

      appointment.status = 'cancelled';
      appointment.cancellation = {
        by: req.auth.userId,
        byRole: 'patient',
        at: new Date(),
      };
      await appointment.save({ session });

      slot.status = 'open';
      slot.heldBy = undefined;
      slot.holdExpiresAt = undefined;
      slot.appointmentId = undefined;
      await slot.save({ session });

      cancelledAppointment = appointment;
    });

    return res.json({
      success: true,
      data: { id: cancelledAppointment._id, status: cancelledAppointment.status },
    });
  } catch (error) {
    return returnKnownError(res, error);
  } finally {
    await session.endSession();
  }
}

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
    status: { $in: ['confirmed', 'in_progress'] },
  })
    .select('patientId startAt endAt mode status')
    .populate({ path: 'patientId', select: 'name' })
    .sort({ startAt: 1 })
    .limit(100)
    .lean();

  const timezone = doctorProfile.timezone || 'Asia/Kolkata';
  return res.json({
    timezone,
    appointments: appointments.map((appointment) => ({
      id: appointment._id.toString(),
      patientName: appointment.patientId?.name || 'Patient',
      startAt: appointment.startAt,
      slotTime: timeLabel(appointment.startAt, timezone),
      endAt: appointment.endAt,
      mode: appointment.mode,
      status: appointment.status,
    })),
  });
}

async function getCompletedDoctorAppointments(req, res) {
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
    status: 'completed',
  })
    .select('patientId startAt endAt mode status')
    .populate({ path: 'patientId', select: 'name' })
    .sort({ startAt: -1 })
    .limit(100)
    .lean();
  const timezone = doctorProfile.timezone || 'Asia/Kolkata';

  return res.json({
    timezone,
    appointments: appointments.map((appointment) => ({
      id: appointment._id.toString(),
      patientName: appointment.patientId?.name || 'Patient',
      startAt: appointment.startAt,
      slotTime: timeLabel(appointment.startAt, timezone),
      endAt: appointment.endAt,
      mode: appointment.mode,
      status: appointment.status,
    })),
  });
}

async function completeDoctorAppointment(req, res) {
  const { appointmentId } = req.params;
  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({ success: false, message: 'A valid appointment ID is required.' });
  }

  const doctorProfile = await DoctorProfile.findOne({ userId: req.auth.userId }).select('_id');
  if (!doctorProfile) {
    return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: doctorProfile._id,
  });
  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found.' });
  }
  if (appointment.status === 'completed') {
    return res.json({ success: true, appointmentId: appointment._id, status: appointment.status });
  }
  if (!['confirmed', 'in_progress'].includes(appointment.status)) {
    return res.status(409).json({
      success: false,
      message: 'Only confirmed or in-progress appointments can be completed.',
    });
  }
  if (appointment.endAt > new Date()) {
    return res.status(409).json({
      success: false,
      message: 'An appointment cannot be completed before its scheduled end time.',
    });
  }

  appointment.status = 'completed';
  await appointment.save();

  return res.json({ success: true, appointmentId: appointment._id, status: appointment.status });
}

async function savePrescription(req, res) {
  const { appointmentId } = req.params;
  const { medicines } = req.body || {};

  if (!mongoose.isValidObjectId(appointmentId)) {
    return res.status(400).json({ success: false, message: 'A valid appointment ID is required.' });
  }
  if (
    !Array.isArray(medicines) ||
    medicines.length === 0 ||
    medicines.length > 30 ||
    medicines.some((medicine) =>
      !medicine ||
      typeof medicine.name !== 'string' ||
      !medicine.name.trim() ||
      medicine.name.trim().length > 100 ||
      typeof medicine.dosage !== 'string' ||
      !medicine.dosage.trim() ||
      medicine.dosage.trim().length > 100 ||
      typeof medicine.frequency !== 'string' ||
      !medicine.frequency.trim() ||
      medicine.frequency.trim().length > 100 ||
      typeof medicine.duration !== 'string' ||
      !medicine.duration.trim() ||
      medicine.duration.trim().length > 100
    )
  ) {
    return res.status(400).json({
      success: false,
      message: 'Add 1 to 30 medicines, each with a name, dosage, frequency, and duration.',
    });
  }

  const doctorProfile = await DoctorProfile.findOne({ userId: req.auth.userId }).select('_id');
  if (!doctorProfile) {
    return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
  }

  const appointment = await Appointment.findOne({
    _id: appointmentId,
    doctorId: doctorProfile._id,
    status: 'completed',
  });
  if (!appointment) {
    const assignedAppointment = await Appointment.exists({
      _id: appointmentId,
      doctorId: doctorProfile._id,
    });
    return res.status(assignedAppointment ? 409 : 404).json({
      success: false,
      message: assignedAppointment
        ? 'Prescriptions can only be saved after the appointment is completed.'
        : 'Completed appointment not found.',
    });
  }

  const normalizedMedicines = medicines.map((medicine) => ({
    name: medicine.name.trim(),
    dosage: medicine.dosage.trim(),
    frequency: medicine.frequency.trim(),
    duration: medicine.duration.trim(),
  }));
  let prescription = await Prescription.findOne({ appointmentId });
  if (
    prescription &&
    (
      prescription.doctorId.toString() !== doctorProfile._id.toString() ||
      prescription.patientId.toString() !== appointment.patientId.toString()
    )
  ) {
    return res.status(409).json({
      success: false,
      message: 'Existing prescription ownership does not match this appointment.',
    });
  }
  if (prescription?.signedAt) {
    return res.status(409).json({
      success: false,
      message: 'A signed prescription cannot be changed.',
    });
  }

  const isNew = !prescription;
  if (!prescription) {
    prescription = new Prescription({
      appointmentId,
      doctorId: doctorProfile._id,
      patientId: appointment.patientId,
      version: 1,
    });
  } else {
    prescription.version = (prescription.version || 1) + 1;
  }
  prescription.medicinesJson = JSON.stringify(normalizedMedicines);

  try {
    await prescription.save();
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A prescription already exists for this appointment.',
      });
    }
    throw error;
  }

  return res.status(isNew ? 201 : 200).json({
    success: true,
    data: {
      id: prescription._id,
      appointmentId: prescription.appointmentId,
      version: prescription.version,
      medicines: normalizedMedicines,
    },
  });
}

module.exports = {
  getAvailableSlots,
  holdSlot,
  confirmBooking,
  getPatientAppointments,
  cancelPatientAppointment,
  getDoctorAppointments,
  getCompletedDoctorAppointments,
  completeDoctorAppointment,
  savePrescription,
};
