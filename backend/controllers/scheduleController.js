const {
  AvailabilityRule,
  DoctorProfile,
  Slot,
} = require('../models');
const { generateSlotsForDoctor } = require('../services/scheduleGenerator');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatRuleResponse(rule) {
  return {
    dayOfWeek: rule.dayOfWeek,
    day: DAY_NAMES[rule.dayOfWeek],
    startTime: rule.startTime,
    endTime: rule.endTime,
    slotMins: rule.slotMins,
    breakMins: rule.breakMins || 0,
    sameForDay: rule.sameForDay !== false,
    mode: rule.mode,
    customSlots: Array.isArray(rule.customSlots)
      ? rule.customSlots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        mode: slot.mode,
        restAfterMins: slot.restAfterMins || 0,
        active: slot.active !== false,
      }))
      : [],
  };
}

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
    weeklySchedule: rules.map(formatRuleResponse),
  });
}

function parseScheduleTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
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

    const dayName = DAY_NAMES[entry.dayOfWeek];
    const startMinutes = parseScheduleTime(entry.startTime);
    const endMinutes = parseScheduleTime(entry.endTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return `${dayName} must have valid hours with an end time after the start time.`;
    }

    if (
      !Number.isInteger(entry.slotMins) ||
      entry.slotMins < 5 ||
      entry.slotMins > 240 ||
      endMinutes - startMinutes < entry.slotMins
    ) {
      return `${dayName} must have a slot duration between 5 and 240 minutes that fits within working hours.`;
    }

    const breakMins = entry.breakMins ?? 0;
    if (!Number.isInteger(breakMins) || breakMins < 0 || breakMins > 240) {
      return `${dayName} rest buffer must be an integer between 0 and 240 minutes.`;
    }

    const hasCustomSlots = Array.isArray(entry.customSlots) && entry.customSlots.length > 0;

    if (entry.mode === 'custom') {
      if (!hasCustomSlots) {
        return `${dayName} uses custom mode and must include at least one timeline slot.`;
      }
    } else if (typeof entry.mode !== 'string' || !consultationModes.includes(entry.mode)) {
      return `${dayName} has a consultation mode not enabled on your profile.`;
    }

    if (entry.customSlots !== undefined) {
      if (!Array.isArray(entry.customSlots) || entry.customSlots.length > 60) {
        return `${dayName} customSlots must be an array of up to 60 slots.`;
      }

      const parsedSlots = [];
      for (const slot of entry.customSlots) {
        const sStart = parseScheduleTime(slot?.startTime);
        const sEnd = parseScheduleTime(slot?.endTime);
        if (sStart === null || sEnd === null || sEnd <= sStart) {
          return `${dayName} contains a slot with invalid start or end time.`;
        }

        const dur = sEnd - sStart;
        if (dur < 5 || dur > 240) {
          return `${dayName} contains a slot whose duration is outside 5–240 minutes.`;
        }

        const slotMode = slot.mode || (entry.mode === 'in_person' ? 'in_person' : 'video');
        if (!consultationModes.includes(slotMode)) {
          return `${dayName} has a slot using a consultation mode not enabled on your profile.`;
        }

        const restAfter = slot.restAfterMins ?? 0;
        if (!Number.isInteger(restAfter) || restAfter < 0 || restAfter > 240) {
          return `${dayName} contains an invalid rest duration after a slot.`;
        }

        parsedSlots.push({ sStart, sEnd });
      }

      // Interval overlap validation (sort by start time and verify no overlaps)
      parsedSlots.sort((a, b) => a.sStart - b.sStart);
      for (let i = 1; i < parsedSlots.length; i += 1) {
        if (parsedSlots[i - 1].sEnd > parsedSlots[i].sStart) {
          return `${dayName} contains overlapping consultation slots.`;
        }
      }
    }
  }

  return null;
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
      breakMins: entry.breakMins ?? 0,
      sameForDay: entry.sameForDay !== false,
      mode: entry.mode,
      customSlots: Array.isArray(entry.customSlots)
        ? entry.customSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          mode: slot.mode || (entry.mode === 'in_person' ? 'in_person' : 'video'),
          restAfterMins: slot.restAfterMins ?? 0,
          active: slot.active !== false,
        }))
        : [],
      effectiveFrom: now,
      isActive: true,
    })));

  const result = await generateSlotsForDoctor(profile, newRules, now);

  return res.json({
    message: 'Weekly schedule saved.',
    timezone: profile.timezone || 'Asia/Kolkata',
    advanceBookingDays: profile.advanceBookingDays || 30,
    generatedSlots: result.generated,
    weeklySchedule: newRules.map(formatRuleResponse),
  });
}

module.exports = {
  getWeeklySchedule,
  saveWeeklySchedule,
  validateWeeklySchedule,
};