const {
  AvailabilityRule,
  DoctorProfile,
  Slot,
  TimeOff,
} = require('../models');

function getZonedParts(date, timeZone) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    return Object.fromEntries(
      formatter.formatToParts(date)
        .filter(({ type }) => type !== 'literal')
        .map(({ type, value }) => [type, Number(value)])
    );
  } catch (error) {
    if (error instanceof RangeError) {
      throw new Error(`Invalid doctor timezone: "${timeZone}".`);
    }

    throw error;
  }
}

function getLocalDateString(date, timeZone) {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addLocalDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function localDateTimeToUTC(dateString, minutesAfterMidnight, timeZone) {
  const [year, month, day] = dateString.split('-').map(Number);
  const hour = Math.floor(minutesAfterMidnight / 60);
  const minute = minutesAfterMidnight % 60;
  const expectedUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = expectedUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getZonedParts(new Date(candidate), timeZone);
    const representedUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const adjustment = expectedUtc - representedUtc;

    if (adjustment === 0) break;
    candidate += adjustment;
  }

  const resolved = getZonedParts(new Date(candidate), timeZone);
  if (
    resolved.year !== year ||
    resolved.month !== month ||
    resolved.day !== day ||
    resolved.hour !== hour ||
    resolved.minute !== minute
  ) {
    return null;
  }

  return new Date(candidate);
}

function parseTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function buildSlotsForRule(rule, timeZone, now, advanceBookingDays, timeOffs = []) {
  const startMinute = parseTime(rule.startTime);
  const endMinute = parseTime(rule.endTime);
  if (
    startMinute === null ||
    endMinute === null ||
    endMinute <= startMinute ||
    !Number.isInteger(rule.slotMins) ||
    rule.slotMins <= 0
  ) {
    return [];
  }

  const firstDay = getLocalDateString(now, timeZone);
  const generated = [];
  const hasCustomSlots = Array.isArray(rule.customSlots) && rule.customSlots.length > 0;
  const breakMins = Number.isInteger(rule.breakMins) && rule.breakMins >= 0 ? rule.breakMins : 0;
  const fallbackMode = rule.mode === 'in_person' ? 'in_person' : 'video';

  const pushIfBookable = (dateString, slotStartMins, slotEndMins, slotMode) => {
    const startAt = localDateTimeToUTC(dateString, slotStartMins, timeZone);
    const endAt = localDateTimeToUTC(dateString, slotEndMins, timeZone);

    if (!startAt || !endAt || startAt < now || endAt <= startAt) return;
    if (rule.effectiveFrom && startAt < new Date(rule.effectiveFrom)) return;
    if (rule.effectiveTo && startAt >= new Date(rule.effectiveTo)) return;
    if (timeOffs.some((timeOff) =>
      startAt < new Date(timeOff.endAt) &&
      endAt > new Date(timeOff.startAt)
    )) {
      return;
    }

    generated.push({
      doctorId: rule.doctorId,
      startAt,
      endAt,
      status: 'open',
      mode: slotMode === 'in_person' ? 'in_person' : 'video',
      ruleId: rule._id,
    });
  };

  for (let dayOffset = 0; dayOffset < advanceBookingDays; dayOffset += 1) {
    const dateString = addLocalDays(firstDay, dayOffset);
    const [year, month, day] = dateString.split('-').map(Number);
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== rule.dayOfWeek) {
      continue;
    }

    if (hasCustomSlots) {
      // Path A: Generate exact slots from the doctor's custom timeline (skipping Break / Off slots)
      for (const slot of rule.customSlots) {
        if (slot.active === false) continue;
        const sStart = parseTime(slot.startTime);
        const sEnd = parseTime(slot.endTime);
        if (sStart === null || sEnd === null || sEnd <= sStart) continue;
        pushIfBookable(dateString, sStart, sEnd, slot.mode || fallbackMode);
      }
    } else {
      // Path B: Standard contiguous/buffered generation using slotMins + breakMins
      for (
        let start = startMinute;
        start + rule.slotMins <= endMinute;
        start += rule.slotMins + breakMins
      ) {
        pushIfBookable(dateString, start, start + rule.slotMins, fallbackMode);
      }
    }
  }

  return generated;
}

async function generateSlotsForDoctor(doctorProfile, rules, now = new Date()) {
  const advanceBookingDays = doctorProfile.advanceBookingDays || 30;
  const timeZone = doctorProfile.timezone || 'Asia/Kolkata';
  const firstDay = getLocalDateString(now, timeZone);
  const horizonEndDate = addLocalDays(firstDay, advanceBookingDays);
  const horizonEnd = localDateTimeToUTC(horizonEndDate, 0, timeZone);

  if (!horizonEnd) {
    throw new Error(`Could not resolve schedule horizon in timezone "${timeZone}".`);
  }

  const timeOffs = await TimeOff.find({
    doctorId: doctorProfile._id,
    startAt: { $lt: horizonEnd },
    endAt: { $gt: now },
  }).select('startAt endAt').lean();

  const slots = rules.flatMap((rule) =>
    buildSlotsForRule(rule, timeZone, now, advanceBookingDays, timeOffs)
  );

  if (slots.length === 0) {
    return { generated: 0, horizonEnd };
  }

  const operations = slots.map((slot) => ({
    updateOne: {
      filter: { doctorId: slot.doctorId, startAt: slot.startAt },
      update: { $setOnInsert: slot },
      upsert: true,
    },
  }));
  const result = await Slot.bulkWrite(operations, { ordered: false });

  return {
    generated: result.upsertedCount,
    horizonEnd,
  };
}

async function extendDoctorSchedule(doctorId, now = new Date()) {
  const profile = await DoctorProfile.findById(doctorId);
  if (!profile) throw new Error('Doctor profile not found.');

  const rules = await AvailabilityRule.find({
    doctorId: profile._id,
    isActive: true,
  });

  return generateSlotsForDoctor(profile, rules, now);
}

module.exports = {
  getLocalDateString,
  localDateTimeToUTC,
  parseTime,
  buildSlotsForRule,
  generateSlotsForDoctor,
  extendDoctorSchedule,
};
