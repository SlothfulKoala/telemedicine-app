const {
  AvailabilityRule,
  DoctorProfile,
  Slot,
} = require('../models');
const { generateSlotsForDoctor } = require('../services/scheduleGenerator');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function getWeeklySchedule(req, res) {
  const profile = await DoctorProfile.findOne({ userId: req.auth.userId });
  if (!profile) {
    return res.status(404).json({ message: 'Complete your doctor profile first.' });
  }

  const rules = await AvailabilityRule.find({
    doctorId: profile._id,
    isActive: true,
  }).sort({ dayOfWeek: 1 }).lean();

  return res.json({
    timezone: profile.timezone || 'Asia/Kolkata',
    advanceBookingDays: profile.advanceBookingDays || 30,
    consultationModes: profile.consultationModes,
    weeklySchedule: rules.map((rule) => ({
      dayOfWeek: rule.dayOfWeek,
      day: DAY_NAMES[rule.dayOfWeek],
      startTime: rule.startTime,
      endTime: rule.endTime,
      slotMins: rule.slotMins,
      mode: rule.mode,
    })),
  });
}

function validateWeeklySchedule(weeklySchedule, consultationModes) {
  if (!Array.isArray(weeklySchedule)) {
    return 'Weekly schedule must be an array.';
  }

  const seenDays = new Set();
  for (const entry of weeklySchedule) {
    if (
      !entry ||
      !Number.isInteger(entry.dayOfWeek) ||
      entry.dayOfWeek < 0 ||
      entry.dayOfWeek > 6 ||
      seenDays.has(entry.dayOfWeek)
    ) {
      return 'Each schedule entry must have a unique weekday from Sunday to Saturday.';
    }
    seenDays.add(entry.dayOfWeek);

    const startMinutes = parseScheduleTime(entry.startTime);
    const endMinutes = parseScheduleTime(entry.endTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return `${DAY_NAMES[entry.dayOfWeek]} must have valid hours with an end time after the start time.`;
    }

    if (
      !Number.isInteger(entry.slotMins) ||
      entry.slotMins < 5 ||
      entry.slotMins > 240 ||
      (endMinutes - startMinutes) % entry.slotMins !== 0
    ) {
      return `${DAY_NAMES[entry.dayOfWeek]} hours must divide evenly into slots between 5 and 240 minutes.`;
    }

    if (
      typeof entry.mode !== 'string' ||
      !consultationModes.includes(entry.mode)
    ) {
      return `${DAY_NAMES[entry.dayOfWeek]} has a consultation mode not enabled on your profile.`;
    }
  }

  return null;
}

function parseScheduleTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

async function saveWeeklySchedule(req, res) {
  const profile = await DoctorProfile.findOne({ userId: req.auth.userId });
  if (!profile) {
    return res.status(404).json({ message: 'Complete your doctor profile first.' });
  }

  const { weeklySchedule } = req.body || {};
  const validationError = validateWeeklySchedule(
    weeklySchedule,
    profile.consultationModes
  );
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const now = new Date();
  const currentRules = await AvailabilityRule.find({
    doctorId: profile._id,
    isActive: true,
  }).select('_id');
  const currentRuleIds = currentRules.map(({ _id }) => _id);

  if (currentRuleIds.length > 0) {
    await Slot.deleteMany({
      doctorId: profile._id,
      ruleId: { $in: currentRuleIds },
      status: 'open',
      startAt: { $gte: now },
    });

    await AvailabilityRule.updateMany(
      { _id: { $in: currentRuleIds } },
      { $set: { isActive: false, effectiveTo: now } }
    );
  }

  const newRules = weeklySchedule.length === 0
    ? []
    : await AvailabilityRule.create(weeklySchedule.map((entry) => ({
      doctorId: profile._id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      slotMins: entry.slotMins,
      mode: entry.mode,
      effectiveFrom: now,
      isActive: true,
    })));

  const result = await generateSlotsForDoctor(profile, newRules, now);

  return res.json({
    message: 'Weekly schedule saved.',
    timezone: profile.timezone || 'Asia/Kolkata',
    advanceBookingDays: profile.advanceBookingDays || 30,
    generatedSlots: result.generated,
    weeklySchedule: newRules.map((rule) => ({
      dayOfWeek: rule.dayOfWeek,
      day: DAY_NAMES[rule.dayOfWeek],
      startTime: rule.startTime,
      endTime: rule.endTime,
      slotMins: rule.slotMins,
      mode: rule.mode,
    })),
  });
}

module.exports = {
  getWeeklySchedule,
  saveWeeklySchedule,
  validateWeeklySchedule,
};
