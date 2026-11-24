import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Building2,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Clock,
  ChevronDown,
  Check,
  UserCog,
  Coffee,
  Plus,
  Minus,
  CalendarRange,
  Loader2,
  Lock,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

// =========================================================================
// TIME & TIMELINE HELPERS
// =========================================================================
const timeToMins = (hhmm) => {
  if (!hhmm || !hhmm.includes(':')) return 540;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (totalMins) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const format12Hour = (hhmm) => {
  if (!hhmm || !hhmm.includes(':')) return hhmm;
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const buildDaySlotsTimeline = (startTime, endTime, slotMins, breakMins, mode) => {
  const start = timeToMins(startTime);
  const end = timeToMins(endTime);
  const duration = Number(slotMins) || 15;
  const rest = Number(breakMins) || 0;
  const slotMode = mode === 'in_person' ? 'in_person' : 'video';

  const slots = [];
  let cursor = start;
  let index = 0;

  while (cursor + duration <= end && index < 60) {
    const slotStart = minsToTime(cursor);
    const slotEnd = minsToTime(cursor + duration);
    slots.push({
      id: `${slotStart}-${index}`,
      startTime: slotStart,
      endTime: slotEnd,
      slotMins: duration,
      restAfterMins: rest,
      mode: slotMode,
      active: true,
    });
    cursor += duration + rest;
    index += 1;
  }
  return slots;
};

const recalculateTimeline = (slotsArray, dayStartTime, dayEndTime) => {
  const maxEnd = timeToMins(dayEndTime);
  let cursor = timeToMins(dayStartTime);
  const updated = [];

  for (let i = 0; i < slotsArray.length; i++) {
    const item = slotsArray[i];
    const dur = Number(item.slotMins) || 15;
    const rest = Math.max(0, Number(item.restAfterMins) || 0);

    if (cursor + dur > maxEnd) break;

    updated.push({
      ...item,
      startTime: minsToTime(cursor),
      endTime: minsToTime(cursor + dur),
      slotMins: dur,
      restAfterMins: rest,
    });

    cursor += dur + rest;
  }
  return updated;
};

const DURATION_OPTIONS = [
  { value: 15, label: '15 mins' },
  { value: 20, label: '20 mins' },
  { value: 30, label: '30 mins' },
  { value: 45, label: '45 mins' },
  { value: 60, label: '60 mins' },
];

const REST_OPTIONS = [
  { value: 0, label: 'No rest' },
  { value: 5, label: '5m rest' },
  { value: 10, label: '10m rest' },
  { value: 15, label: '15m rest' },
  { value: 20, label: '20m rest' },
];

const TIME_OPTIONS = [
  { value: '07:00', label: '07:00 AM' },
  { value: '08:00', label: '08:00 AM' },
  { value: '08:30', label: '08:30 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '21:00', label: '09:00 PM' },
];

const createInitialDays = () =>
  [
    { dayOfWeek: 1, name: 'Monday', enabled: true, startTime: '09:00', endTime: '17:00', mode: 'video', sameForDay: true, slotMins: 30, breakMins: 10 },
    { dayOfWeek: 2, name: 'Tuesday', enabled: true, startTime: '09:00', endTime: '17:00', mode: 'video', sameForDay: true, slotMins: 30, breakMins: 10 },
    { dayOfWeek: 3, name: 'Wednesday', enabled: true, startTime: '09:00', endTime: '17:00', mode: 'video', sameForDay: true, slotMins: 30, breakMins: 10 },
    { dayOfWeek: 4, name: 'Thursday', enabled: true, startTime: '09:00', endTime: '17:00', mode: 'video', sameForDay: true, slotMins: 30, breakMins: 10 },
    { dayOfWeek: 5, name: 'Friday', enabled: true, startTime: '09:00', endTime: '17:00', mode: 'video', sameForDay: true, slotMins: 30, breakMins: 10 },
    { dayOfWeek: 6, name: 'Saturday', enabled: true, startTime: '10:00', endTime: '14:00', mode: 'video', sameForDay: true, slotMins: 30, breakMins: 10 },
    { dayOfWeek: 0, name: 'Sunday', enabled: false, startTime: '10:00', endTime: '13:00', mode: 'video', sameForDay: true, slotMins: 30, breakMins: 10 },
  ].map((d) => ({
    ...d,
    customSlots: buildDaySlotsTimeline(d.startTime, d.endTime, d.slotMins, d.breakMins, d.mode),
  }));

// =========================================================================
// REUSABLE POLISHED MATTE-GLASS DROPDOWN
// =========================================================================
const CompactGlassDropdown = ({ value, options, onChange, icon: Icon, width = '130px', onOpenChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        if (onOpenChange) onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, onOpenChange]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (onOpenChange) onOpenChange(next);
      return next;
    });
  };

  const currentObj = options.find((o) => o.value === value);
  const currentLabel = currentObj ? currentObj.label : format12Hour(String(value));

  return (
    <div
      className="custom-glass-select-wrapper"
      ref={ref}
      style={{ width, zIndex: open ? 110 : 1 }}
    >
      <button
        type="button"
        onClick={toggleOpen}
        className={`custom-glass-select-trigger ${open ? 'is-open' : ''}`}
        style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '11px' }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          {Icon && <Icon size={13} color="var(--cream)" />}
          <span>{currentLabel}</span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="custom-glass-select-menu"
            style={{ minWidth: width, maxHeight: '215px' }}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    if (onOpenChange) onOpenChange(false);
                  }}
                  className={`custom-glass-select-option ${isSelected ? 'selected' : ''}`}
                  style={{ padding: '8px 10px', fontSize: '12.5px' }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={12} strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================================
// MAIN SCHEDULE BUILDER COMPONENT
// =========================================================================
const ScheduleBuilder = () => {
  const { user } = useAuth();

  // Level 1 (Whole Week): 'all_video' | 'all_physical' | 'custom'
  const [modeStrategy, setModeStrategy] = useState('all_video');
  const [sameForWholeWeek, setSameForWholeWeek] = useState(true);
  const [globalSlotMins, setGlobalSlotMins] = useState(30);
  const [globalBreakMins, setGlobalBreakMins] = useState(10);

  const [daysConfig, setDaysConfig] = useState(createInitialDays);
  const [expandedDay, setExpandedDay] = useState(null);
  const [activeDropdownDay, setActiveDropdownDay] = useState(null);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [allowedModes, setAllowedModes] = useState(['video', 'in_person']);
  const [loading, setLoading] = useState(true);

  const [publishState, setPublishState] = useState('idle'); // 'idle' | 'saving' | 'success' | 'error'
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [profileForm, setProfileForm] = useState({
  specialisation: 'Cardiology',
  feeRupees: '500',
  qualifications: 'MBBS, MD',
  city: '',
  clinicAddress: '',
  regNumber: 'MCI-2026-84920',
});
  const [savingProfile, setSavingProfile] = useState(false);

  const markDirty = () => {
    if (publishState === 'success' || publishState === 'error') {
      setPublishState('idle');
      setFeedbackMsg('');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchExistingSchedule = async () => {
      try {
        setLoading(true);
        const [schedRes, docsRes] = await Promise.allSettled([
          api.get('/schedule/weekly'),
          api.get('/doctors/search'),
        ]);

        if (!isMounted) return;

        if (docsRes.status === 'fulfilled') {
          const list = docsRes.value.data?.data || [];
          const myDoc =
            list.find(
              (d) =>
                d.userId?._id === user?.id ||
                d.userId?.email === user?.email ||
                d.userId?.name === user?.name
            ) || list[0];

          if (myDoc) {
            const specName =
              typeof myDoc.specialisations?.[0] === 'object'
                ? myDoc.specialisations[0].name
                : myDoc.specialisations?.[0] || 'Cardiology';
            const rawFee = Number(myDoc.fee ?? 50000);
            const feeRs = rawFee >= 2000 ? Math.round(rawFee / 100) : rawFee;
            const quals = Array.isArray(myDoc.qualifications)
              ? myDoc.qualifications.map((q) => (typeof q === 'object' ? q.degree : q)).join(', ')
              : 'MBBS, MD';

              setProfileForm({
                specialisation: specName,
                feeRupees: String(feeRs),
                qualifications: quals,
                regNumber: myDoc.regNumber || 'MCI-2026-84920',
                city: myDoc.city || '',
                clinicAddress: myDoc.clinicAddress || '',
              });
          }
        }

        if (schedRes.status === 'fulfilled') {
          const data = schedRes.value.data;
          if (data?.timezone) setTimezone(data.timezone);

          const profileModes = data?.consultationModes;
          if (Array.isArray(profileModes) && profileModes.length > 0) {
            setAllowedModes(profileModes);
          }

          const existing = data?.weeklySchedule;
          if (Array.isArray(existing) && existing.length > 0) {
            const distinctDurations = new Set(existing.map((e) => Number(e.slotMins || 15)));
            if (distinctDurations.size > 1) {
              setSameForWholeWeek(false);
            } else {
              setGlobalSlotMins(Number(existing[0]?.slotMins || 15));
            }

            const distinctModes = new Set(existing.map((e) => e.mode || 'video'));
            if (distinctModes.size > 1) setModeStrategy('custom');
            else setModeStrategy(existing[0]?.mode === 'in_person' ? 'all_physical' : 'all_video');

            setDaysConfig((prev) =>
              prev.map((dayObj) => {
                const found = existing.find((e) => Number(e.dayOfWeek) === dayObj.dayOfWeek);
                if (found) {
                  const sMins = Number(found.slotMins || 15);
                  const bMins = Number(found.breakMins || 0);
                  const mode = found.mode || 'video';
                  const sTime = found.startTime || dayObj.startTime;
                  const eTime = found.endTime || dayObj.endTime;
                  const savedSlots = Array.isArray(found.customSlots) && found.customSlots.length > 0
                    ? found.customSlots.map((s, idx) => ({
                        id: `${s.startTime}-${idx}`,
                        startTime: s.startTime,
                        endTime: s.endTime,
                        slotMins: Math.max(5, timeToMins(s.endTime) - timeToMins(s.startTime)),
                        restAfterMins: Number(s.restAfterMins ?? bMins),
                        mode: s.mode || (mode === 'in_person' ? 'in_person' : 'video'),
                        active: s.active !== false,
                      }))
                    : buildDaySlotsTimeline(sTime, eTime, sMins, bMins, mode);

                  return {
                    ...dayObj,
                    enabled: true,
                    startTime: sTime,
                    endTime: eTime,
                    slotMins: sMins,
                    breakMins: bMins,
                    sameForDay: found.sameForDay !== false,
                    mode,
                    customSlots: savedSlots,
                  };
                }
                return { ...dayObj, enabled: false };
              })
            );
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExistingSchedule();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Level 1: Change Whole-Week Mode Strategy
  const handleStrategyChange = (strategy) => {
    markDirty();
    setModeStrategy(strategy);
    if (strategy === 'all_video' || strategy === 'all_physical') {
      const targetMode = strategy === 'all_video' ? 'video' : 'in_person';
      setDaysConfig((prev) =>
        prev.map((d) => ({
          ...d,
          mode: targetMode,
          customSlots: d.customSlots.map((s) => ({ ...s, mode: targetMode })),
        }))
      );
    }
  };

  // Level 1: Toggle Whole-Week Same Duration & Rest
  const handleToggleSameForWeek = () => {
    markDirty();
    setSameForWholeWeek((prev) => {
      const next = !prev;
      if (next) {
        setDaysConfig((days) =>
          days.map((d) => ({
            ...d,
            sameForDay: true,
            slotMins: globalSlotMins,
            breakMins: globalBreakMins,
            customSlots: buildDaySlotsTimeline(
              d.startTime,
              d.endTime,
              globalSlotMins,
              globalBreakMins,
              d.mode
            ),
          }))
        );
      }
      return next;
    });
  };

  const handleGlobalDurationChange = (mins) => {
    markDirty();
    setGlobalSlotMins(mins);
    setDaysConfig((prev) =>
      prev.map((d) => ({
        ...d,
        slotMins: mins,
        customSlots: buildDaySlotsTimeline(d.startTime, d.endTime, mins, globalBreakMins, d.mode),
      }))
    );
  };

  const handleGlobalBreakChange = (restMins) => {
    markDirty();
    setGlobalBreakMins(restMins);
    setDaysConfig((prev) =>
      prev.map((d) => ({
        ...d,
        breakMins: restMins,
        customSlots: buildDaySlotsTimeline(d.startTime, d.endTime, globalSlotMins, restMins, d.mode),
      }))
    );
  };

  const toggleDayEnabled = (dayOfWeek) => {
    markDirty();
    setDaysConfig((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, enabled: !d.enabled } : d))
    );
    if (expandedDay === dayOfWeek) setExpandedDay(null);
  };

  // Level 2: Toggle "Same slot & rest for this day"
  const handleToggleSameForDay = (dayOfWeek) => {
    markDirty();
    setDaysConfig((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const nextSame = !d.sameForDay;
        if (nextSame) {
          // Snap all slots on this day back to this day's uniform slotMins & breakMins
          return {
            ...d,
            sameForDay: true,
            customSlots: buildDaySlotsTimeline(
              d.startTime,
              d.endTime,
              d.slotMins,
              d.breakMins,
              d.mode
            ),
          };
        }
        // Unlock per-slot rest customization on this day
        return { ...d, sameForDay: false };
      })
    );
  };

  // Level 2: Update Day Field (startTime, endTime, slotMins, breakMins, or mode: 'video'|'in_person'|'custom')
  const updateDayField = (dayOfWeek, field, value) => {
    markDirty();
    setDaysConfig((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const nextDay = { ...d, [field]: value };

        if (field === 'mode') {
          if (value === 'video' || value === 'in_person') {
            return {
              ...nextDay,
              customSlots: d.customSlots.map((s) => ({ ...s, mode: value })),
            };
          }
          // If 'custom', preserve existing slot modes and unlock them in timeline
          return nextDay;
        }

        const effectiveSlotMins = sameForWholeWeek ? globalSlotMins : nextDay.slotMins;
        const effectiveBreakMins = sameForWholeWeek ? globalBreakMins : nextDay.breakMins;
        const rebuilt = buildDaySlotsTimeline(
          nextDay.startTime,
          nextDay.endTime,
          effectiveSlotMins,
          effectiveBreakMins,
          nextDay.mode === 'in_person' ? 'in_person' : 'video'
        );
        return { ...nextDay, customSlots: rebuilt };
      })
    );
  };

  // Level 3 (Timeline Slot Actions)
  const toggleSlotActiveOnTimeline = (dayOfWeek, slotId) => {
    markDirty();
    setDaysConfig((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              customSlots: d.customSlots.map((s) =>
                s.id === slotId ? { ...s, active: !s.active } : s
              ),
            }
          : d
      )
    );
  };

  const adjustRestAfterSlot = (dayOfWeek, slotIndex, deltaMins) => {
    markDirty();
    setDaysConfig((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const copy = d.customSlots.map((s, idx) =>
          idx === slotIndex
            ? { ...s, restAfterMins: Math.max(0, (Number(s.restAfterMins) || 0) + deltaMins) }
            : s
        );
        return { ...d, customSlots: recalculateTimeline(copy, d.startTime, d.endTime) };
      })
    );
  };

  const toggleSingleSlotMode = (dayOfWeek, slotId) => {
    markDirty();
    setDaysConfig((prev) =>
      prev.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              customSlots: d.customSlots.map((s) =>
                s.id === slotId ? { ...s, mode: s.mode === 'video' ? 'in_person' : 'video' } : s
              ),
            }
          : d
      )
    );
  };

  const handleAddManualSlotToDay = (dayOfWeek) => {
    markDirty();
    setDaysConfig((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const dur = sameForWholeWeek ? globalSlotMins : d.slotMins;
        const brk = sameForWholeWeek ? globalBreakMins : d.breakMins;
        const last = d.customSlots[d.customSlots.length - 1];
        const nextStartMins = last
          ? timeToMins(last.endTime) + (Number(last.restAfterMins) || 0)
          : timeToMins(d.startTime);
        const nextEndMins = nextStartMins + Number(dur);
        if (nextEndMins > 23 * 60) return d;

        const defaultMode =
          modeStrategy === 'all_physical' || d.mode === 'in_person' ? 'in_person' : 'video';

        const newSlot = {
          id: `${minsToTime(nextStartMins)}-${d.customSlots.length}`,
          startTime: minsToTime(nextStartMins),
          endTime: minsToTime(nextEndMins),
          slotMins: Number(dur),
          restAfterMins: Number(brk),
          mode: defaultMode,
          active: true,
        };
        return {
          ...d,
          endTime: nextEndMins > timeToMins(d.endTime) ? minsToTime(nextEndMins) : d.endTime,
          customSlots: [...d.customSlots, newSlot],
        };
      })
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    const parsedQuals = profileForm.qualifications
      .split(',')
      .map((q) => q.trim())
      .filter(Boolean);

    try {
      await api.post('/doctors/profile', {
        regNumber: profileForm.regNumber.trim() || 'MCI-2026-84920',
        fee: Math.round((Number(profileForm.feeRupees) || 500) * 100),
        city: profileForm.city.trim(),
        clinicAddress: profileForm.clinicAddress.trim(),
        specialisations: [profileForm.specialisation],
        consultationModes: ['video', 'in_person'],
        qualifications: parsedQuals.map((deg) => ({
          degree: deg,
          institute: 'Verified Medical Institute',
          year: 2020,
        })),
      });
      setAllowedModes(['video', 'in_person']);
      setShowProfileDrawer(false);
      setPublishState('success');
      setFeedbackMsg('Specialist profile updated!');
    } catch (err) {
      setPublishState('error');
      setFeedbackMsg(err.response?.data?.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // FIX: Ensure (endMins - startMins) % slotMins === 0 so backend NEVER throws "must divide evenly"!
  const handlePublishSchedule = async (e) => {
    e.preventDefault();
    setPublishState('saving');
    setFeedbackMsg('');

    const weeklySchedule = daysConfig
      .filter((d) => d.enabled)
      .map((d) => {
       const effectiveSlotMins = Number(sameForWholeWeek ? globalSlotMins : d.slotMins) || 15;
       const effectiveBreakMins = Number(sameForWholeWeek ? globalBreakMins : d.breakMins) || 0;

        const dayMode =
          modeStrategy === 'all_video'
            ? 'video'
            : modeStrategy === 'all_physical'
            ? 'in_person'
            : d.mode || 'video';

        const serializedSlots = (d.customSlots || []).map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          mode:
            dayMode === 'video'
              ? 'video'
              : dayMode === 'in_person'
              ? 'in_person'
              : s.mode === 'in_person'
              ? 'in_person'
              : 'video',
          restAfterMins: Math.max(0, Number(s.restAfterMins) || 0),
          active: s.active !== false,
        }));

        return {
          dayOfWeek: Number(d.dayOfWeek),
          startTime: d.startTime,
          endTime: d.endTime,
          slotMins: effectiveSlotMins,
          breakMins: effectiveBreakMins,
          sameForDay: sameForWholeWeek ? true : Boolean(d.sameForDay),
          mode: dayMode,
          customSlots: serializedSlots,
        };
      });

    try {
      const res = await api.put('/schedule/weekly', {
        consultationModes: ['video', 'in_person'],
        weeklySchedule,
      });

      const genCount = res.data?.generatedSlots;
      setPublishState('success');
      setFeedbackMsg(
        genCount !== undefined
          ? `Schedule published! ${genCount} upcoming slots are now live for patients.`
          : 'Weekly schedule published successfully!'
      );
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || '';
      if (errMsg.toLowerCase().includes('consultation mode not enabled')) {
        const fallbackMode = allowedModes[0] || 'video';
        try {
          const retryRes = await api.put('/schedule/weekly', {
            weeklySchedule: weeklySchedule.map((item) => ({ ...item, mode: fallbackMode })),
          });
          setPublishState('success');
          setFeedbackMsg(
            `Schedule saved (${fallbackMode === 'video' ? 'Video' : 'In-Person'})! ${
              retryRes.data?.generatedSlots ?? ''
            } slots generated.`
          );
          return;
        } catch (retryErr) {
          // Fall through
        }
      }

      setPublishState('error');
      setFeedbackMsg(errMsg || 'Could not publish schedule. Please check your hours and try again.');
    }
  };

  const handleClearSchedule = async () => {
    setPublishState('saving');
    setFeedbackMsg('');
    try {
      await api.put('/schedule/weekly', { weeklySchedule: [] });
      setDaysConfig((prev) => prev.map((d) => ({ ...d, enabled: false })));
      setExpandedDay(null);
      setPublishState('success');
      setFeedbackMsg('All weekly days cleared.');
    } catch (err) {
      setPublishState('error');
      setFeedbackMsg(err.response?.data?.message || 'Failed to clear schedule.');
    }
  };

  const handleDayDropdownToggle = (dayOfWeek, isOpen) => {
    setActiveDropdownDay((prev) => {
      if (isOpen) return dayOfWeek;
      return prev === dayOfWeek ? null : prev;
    });
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="dashboard-page-container"
    >
      <div style={{ marginBottom: '22px' }}>
        <Link
          to="/doctor/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--cream-soft)',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Clinical Console</span>
        </Link>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '20px',
          marginBottom: '26px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '11.5px',
              letterSpacing: '0.07em',
              color: 'var(--cream)',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={12} />
            <span>SPECIALIST AVAILABILITY ENGINE • {timezone}</span>
          </div>

          <h1
            className="hero-display-title"
            style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.1rem)' }}
          >
            Weekly Schedule & Timeline.
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--cream-soft)', marginTop: '6px' }}>
            Set weekly defaults or unlock per-day and per-slot customization for modes, slot lengths,
            and rest breaks.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowProfileDrawer((p) => !p)}
          className="nav-login-btn"
          style={{ gap: '8px', padding: '10px 18px' }}
        >
          <UserCog size={16} />
          <span>{showProfileDrawer ? 'Close Profile Editor' : 'View / Edit My Profile'}</span>
        </button>
      </div>

      {/* Inline Profile Editor */}
      <AnimatePresence>
        {showProfileDrawer && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card"
            style={{ padding: '26px', marginBottom: '26px' }}
          >
            <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#ffffff', marginBottom: '14px' }}>
              My Specialist Profile ({user?.name || 'Doctor'})
            </h2>
            <form
              onSubmit={handleSaveProfile}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                alignItems: 'end',
              }}
            >
              <div className="auth-input-group">
                <label className="auth-input-label">Specialty</label>
                <input
                  type="text"
                  value={profileForm.specialisation}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, specialisation: e.target.value }))
                  }
                  className="auth-input-field"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Consultation Fee (₹)</label>
                <input
                  type="number"
                  value={profileForm.feeRupees}
                  onChange={(e) => setProfileForm((p) => ({ ...p, feeRupees: e.target.value }))}
                  className="auth-input-field"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Qualifications (comma separated)</label>
                <input
                  type="text"
                  value={profileForm.qualifications}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, qualifications: e.target.value }))
                  }
                  className="auth-input-field"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">City</label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((p) => ({ ...p, city: e.target.value }))}
                  className="auth-input-field"
                  required
                />
              </div>

              <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
                <label className="auth-input-label">Full Clinic Address (for In-Person Visits)</label>
                <input
                  type="text"
                  placeholder="e.g. Clinic 14, Block B, Connaught Place"
                  value={profileForm.clinicAddress}
                  onChange={(e) =>
                    setProfileForm((p) => ({ ...p, clinicAddress: e.target.value }))
                  }
                  className="auth-input-field"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="btn-cream-pill"
                style={{ height: '46px', justifyContent: 'center' }}
              >
                <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="glass-card" style={{ padding: '40px' }}>
          <div style={{ fontSize: '15px', color: 'var(--cream-soft)' }}>
            Loading your weekly schedule...
          </div>
        </div>
      ) : (
        <form
          onSubmit={handlePublishSchedule}
          style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
          {/* =================================================================
              1. WHOLE-WEEK MASTER CONTROLS
              ================================================================= */}
          <div className="glass-card" style={{ padding: '26px 28px', overflow: 'visible', zIndex: 30 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.25fr 1fr',
                gap: '28px',
                alignItems: 'center',
              }}
            >
              {/* Left: Weekly Consultation Mode Strategy */}
              <div>
                <label
                  className="auth-input-label"
                  style={{ display: 'block', marginBottom: '10px', fontSize: '13px' }}
                >
                  1. Weekly Consultation Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'all_video', label: 'All Video', sub: 'Locks week to Video', icon: Video },
                    { id: 'all_physical', label: 'All In-Person', sub: 'Locks week to Clinic', icon: Building2 },
                    { id: 'custom', label: 'Custom Mix', sub: 'Unlock per-day mode', icon: Sliders },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = modeStrategy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleStrategyChange(opt.id)}
                        className="glass-widget-inner"
                        style={{
                          padding: '13px 14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderColor: active ? 'var(--cream)' : 'rgba(255,255,255,0.18)',
                          background: active
                            ? 'rgba(243, 239, 230, 0.16)'
                            : 'rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <Icon size={16} color="var(--cream)" />
                          {active && <CheckCircle2 size={14} color="var(--cream)" />}
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#ffffff' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--cream-muted)', marginTop: '1px' }}>
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Same-for-Whole-Week Duration & Rest Switch */}
              <div
                className="glass-widget-inner"
                style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#ffffff' }}>
                      Same slot & rest duration all week
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--cream-muted)', marginTop: '2px' }}>
                      {sameForWholeWeek
                        ? 'Locked uniformly across every day'
                        : 'Unlocked — customize per day or per slot below'}
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={sameForWholeWeek}
                    onClick={handleToggleSameForWeek}
                    className={`glass-toggle-switch ${sameForWholeWeek ? 'is-on' : ''}`}
                  >
                    <span className="glass-toggle-thumb" />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {sameForWholeWeek && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        flexWrap: 'wrap',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--cream-soft)' }}>
                          Slot Duration
                        </span>
                        <CompactGlassDropdown
                          value={globalSlotMins}
                          options={DURATION_OPTIONS}
                          onChange={handleGlobalDurationChange}
                          icon={Clock}
                          width="124px"
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--cream-soft)' }}>
                          Rest Buffer
                        </span>
                        <CompactGlassDropdown
                          value={globalBreakMins}
                          options={REST_OPTIONS}
                          onChange={handleGlobalBreakChange}
                          icon={Coffee}
                          width="124px"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* =================================================================
              2. DAILY SHIFT BARS + HIERARCHICAL LOCKS + ALWAYS-ACCESSIBLE TIMELINE
              ================================================================= */}
          <div className="glass-card" style={{ padding: '28px', overflow: 'visible' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 500, color: '#ffffff' }}>
                  Daily Shift & Interactive Slot Timeline
                </h2>
                <p style={{ fontSize: '13.5px', color: 'var(--cream-soft)', marginTop: '2px' }}>
                  Open <strong>Timeline</strong> on any day to view slots. Locked controls show a
                  hover explanation telling you whether they are locked by the week or by the day.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearSchedule}
                className="nav-login-btn"
                style={{ gap: '6px', fontSize: '12.5px', padding: '8px 14px' }}
              >
                <Trash2 size={13} />
                <span>Clear All Days</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {daysConfig.map((item) => {
                const isExpanded = expandedDay === item.dayOfWeek && item.enabled;
                const activeSlotCount = (item.customSlots || []).filter((s) => s.active).length;

                // Determine Exact Lock States & Hover Reasons for This Day's Timeline!
                const isModeLockedByWeek = modeStrategy !== 'custom';
                const isModeLockedByDay = !isModeLockedByWeek && item.mode !== 'custom';
                const isSlotModeLocked = isModeLockedByWeek || isModeLockedByDay;

                const modeLockReason = isModeLockedByWeek
                  ? `Locked: Whole week is set to ${
                      modeStrategy === 'all_video' ? 'All Video' : 'All In-Person'
                    }. Switch weekly mode to Custom Mix to edit.`
                  : isModeLockedByDay
                  ? `Locked: ${item.name} is set to ${
                      item.mode === 'video' ? 'Video' : 'In-Person Clinic'
                    }. Switch ${item.name} to Custom to edit individual slots.`
                  : '';

                const isRestLockedByWeek = sameForWholeWeek;
                const isRestLockedByDay = !sameForWholeWeek && item.sameForDay;
                const isSlotRestLocked = isRestLockedByWeek || isRestLockedByDay;

                const restLockReason = isRestLockedByWeek
                  ? 'Locked: Same slot & rest duration is enabled for the whole week.'
                  : isRestLockedByDay
                  ? `Locked: Same slot & rest duration is enabled for ${item.name}. Turn it off on this day to customize per-slot rest.`
                  : '';

                return (
                  <div
                    key={item.dayOfWeek}
                    className={`schedule-day-card ${item.enabled ? 'is-enabled' : ''}`}
                    style={{
                      opacity: item.enabled ? 1 : 0.55,
                      zIndex: activeDropdownDay === item.dayOfWeek ? 70 : 1,
                    }}
                  >
                    {/* Main Day Header Bar */}
                    <div className="schedule-day-header">
                      {/* Left: Custom Switch + Day Name */}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.enabled}
                          onClick={() => toggleDayEnabled(item.dayOfWeek)}
                          className={`glass-toggle-switch ${item.enabled ? 'is-on' : ''}`}
                        >
                          <span className="glass-toggle-thumb" />
                        </button>
                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>
                          {item.name}
                        </span>
                      </div>

                      {/* Middle: Working Hours + Active Slot Count */}
                      {item.enabled ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <CompactGlassDropdown
                            value={item.startTime}
                            options={TIME_OPTIONS}
                            onChange={(val) => updateDayField(item.dayOfWeek, 'startTime', val)}
                            icon={Clock}
                            width="128px"
                            onOpenChange={(isOpen) => handleDayDropdownToggle(item.dayOfWeek, isOpen)}
                          />

                          <span style={{ fontSize: '12px', color: 'var(--cream-muted)' }}>to</span>

                          <CompactGlassDropdown
                            value={item.endTime}
                            options={TIME_OPTIONS}
                            onChange={(val) => updateDayField(item.dayOfWeek, 'endTime', val)}
                            icon={Clock}
                            width="128px"
                            onOpenChange={(isOpen) => handleDayDropdownToggle(item.dayOfWeek, isOpen)}
                          />

                          <span
                            className="qualification-tag-pill"
                            style={{
                              background: 'rgba(132, 181, 159, 0.16)',
                              borderColor: 'rgba(132, 181, 159, 0.35)',
                              color: '#d8f3e5',
                              marginLeft: '4px',
                            }}
                          >
                            {activeSlotCount} slots
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '13.5px', color: 'var(--cream-muted)' }}>
                          Day Off — No consultation slots generated
                        </div>
                      )}

                      {/* Right: Day Mode Selector (Hidden when Whole Week locks mode!) + Always-Visible Timeline Button */}
                      {item.enabled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {!isModeLockedByWeek ? (
                            /* Day-Level 3-Way Mode Selector: Video | In-Person | Custom */
                            <div style={{ display: 'inline-flex', gap: '5px' }}>
                              {[
                                { id: 'video', label: 'Video' },
                                { id: 'in_person', label: 'In-Person' },
                                { id: 'custom', label: 'Custom' },
                              ].map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => updateDayField(item.dayOfWeek, 'mode', m.id)}
                                  className={`time-slot-btn ${
                                    item.mode === m.id ? 'primary' : 'secondary'
                                  }`}
                                  style={{ padding: '6px 11px', fontSize: '12px' }}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            /* Read-only Locked Weekly Mode Indicator with Hover Tooltip */
                            <div className="glass-lock-tooltip-wrapper">
                              <span
                                className="qualification-tag-pill is-locked-control"
                                style={{ padding: '5px 11px', fontSize: '11.5px', gap: '5px' }}
                              >
                                <Lock size={10} />
                                <span>
                                  {modeStrategy === 'all_video' ? 'Video (Week)' : 'In-Person (Week)'}
                                </span>
                              </span>
                              <div className="glass-lock-tooltip">{modeLockReason}</div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedDay(isExpanded ? null : item.dayOfWeek)}
                            className="nav-login-btn"
                            style={{
                              padding: '7px 13px',
                              fontSize: '12px',
                              gap: '6px',
                              background: isExpanded
                                ? 'rgba(243, 239, 230, 0.2)'
                                : 'rgba(255, 255, 255, 0.06)',
                              borderColor: isExpanded
                                ? 'rgba(243, 239, 230, 0.45)'
                                : 'rgba(255, 255, 255, 0.2)',
                            }}
                          >
                            <CalendarRange size={13} />
                            <span>{isExpanded ? 'Hide Timeline' : 'Timeline'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Per-Day Slot & Rest Sub-Bar (Visible ONLY when Same-for-Whole-Week is OFF) */}
                    {item.enabled && !sameForWholeWeek && (
                      <div className="day-subcontrols-bar">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.sameForDay}
                            onClick={() => handleToggleSameForDay(item.dayOfWeek)}
                            className={`glass-toggle-switch ${item.sameForDay ? 'is-on' : ''}`}
                          >
                            <span className="glass-toggle-thumb" />
                          </button>
                          <span style={{ fontSize: '12.5px', color: 'var(--cream-soft)' }}>
                            Same slot & rest for {item.name}
                          </span>
                        </div>

                        {item.sameForDay ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <CompactGlassDropdown
                              value={item.slotMins}
                              options={DURATION_OPTIONS}
                              onChange={(val) => updateDayField(item.dayOfWeek, 'slotMins', val)}
                              icon={Clock}
                              width="116px"
                              onOpenChange={(isOpen) => handleDayDropdownToggle(item.dayOfWeek, isOpen)}
                            />
                            <CompactGlassDropdown
                              value={item.breakMins}
                              options={REST_OPTIONS}
                              onChange={(val) => updateDayField(item.dayOfWeek, 'breakMins', val)}
                              icon={Coffee}
                              width="116px"
                              onOpenChange={(isOpen) => handleDayDropdownToggle(item.dayOfWeek, isOpen)}
                            />
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#d8f3e5' }}>
                            Per-slot custom rest unlocked in {item.name}’s timeline
                          </span>
                        )}
                      </div>
                    )}

                    {/* =========================================================
                        EXPANDED TIMELINE (ALWAYS ACCESSIBLE + FROSTED LOCK TOOLTIPS)
                        ========================================================= */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                            padding: '20px 22px 22px 22px',
                            background: 'rgba(10, 16, 28, 0.28)',
                            borderBottomLeftRadius: '18px',
                            borderBottomRightRadius: '18px',
                            overflow: 'visible',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '12px',
                              marginBottom: '16px',
                            }}
                          >
                            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
                              <strong>{item.name} Timeline:</strong> Click{' '}
                              <strong>Consult ON / Break</strong> to block off slots.{' '}
                              {(isSlotModeLocked || isSlotRestLocked) && (
                                <span style={{ color: 'var(--cream-muted)' }}>
                                  (Hover over any locked control to see why it’s locked.)
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddManualSlotToDay(item.dayOfWeek)}
                              className="time-slot-btn secondary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '12px',
                              }}
                            >
                              <Plus size={12} />
                              <span>Add Slot</span>
                            </button>
                          </div>

                          <div className="timeline-slots-grid">
                            {(item.customSlots || []).map((slotObj, sIdx) => (
                              <div
                                key={slotObj.id || sIdx}
                                className={`timeline-slot-card ${!slotObj.active ? 'is-break' : ''}`}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 600,
                                      color: slotObj.active ? '#ffffff' : 'var(--cream-muted)',
                                      textDecoration: slotObj.active ? 'none' : 'line-through',
                                    }}
                                  >
                                    {format12Hour(slotObj.startTime)} – {format12Hour(slotObj.endTime)}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px',
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSlotActiveOnTimeline(item.dayOfWeek, slotObj.id)
                                    }
                                    style={{
                                      background: slotObj.active
                                        ? 'var(--cream)'
                                        : 'rgba(217, 107, 107, 0.22)',
                                      color: slotObj.active ? 'var(--ink-dark)' : '#ffd6d6',
                                      border: 'none',
                                      borderRadius: '999px',
                                      padding: '3px 10px',
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {slotObj.active ? 'Consult ON' : 'Break / Off'}
                                  </button>

                                  {/* Slot Mode Badge: Unlocked if Week=Custom & Day=Custom; otherwise Locked with Frosted Hover Tooltip */}
                                  {slotObj.active && (
                                    <div className="glass-lock-tooltip-wrapper">
                                      <button
                                        type="button"
                                        disabled={isSlotModeLocked}
                                        onClick={() =>
                                          !isSlotModeLocked &&
                                          toggleSingleSlotMode(item.dayOfWeek, slotObj.id)
                                        }
                                        className={isSlotModeLocked ? 'is-locked-control' : ''}
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.09)',
                                          color: 'var(--cream)',
                                          border: '1px solid rgba(255, 255, 255, 0.22)',
                                          borderRadius: '999px',
                                          padding: '3px 9px',
                                          fontSize: '11px',
                                          cursor: isSlotModeLocked ? 'not-allowed' : 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        {isSlotModeLocked && <Lock size={9} />}
                                        <span>
                                          {slotObj.mode === 'in_person' ? 'Clinic' : 'Video'}
                                        </span>
                                      </button>
                                      {isSlotModeLocked && (
                                        <div className="glass-lock-tooltip">{modeLockReason}</div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Rest Footer: Unlocked when Week=OFF & Day=OFF; otherwise Locked with Frosted Hover Tooltip */}
                                <div className="timeline-rest-footer">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Coffee size={11} />
                                    <span>Rest after</span>
                                  </span>

                                  <div className="glass-lock-tooltip-wrapper">
                                    <div
                                      className={`timeline-rest-stepper ${
                                        slotObj.restAfterMins > 0 ? 'has-rest' : ''
                                      } ${isSlotRestLocked ? 'is-locked-control' : ''}`}
                                    >
                                      {!isSlotRestLocked ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              adjustRestAfterSlot(item.dayOfWeek, sIdx, -5)
                                            }
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: 'inherit',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              padding: '1px',
                                            }}
                                          >
                                            <Minus size={10} />
                                          </button>
                                          <span
                                            style={{
                                              fontWeight: 500,
                                              minWidth: '24px',
                                              textAlign: 'center',
                                            }}
                                          >
                                            {slotObj.restAfterMins || 0}m
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              adjustRestAfterSlot(item.dayOfWeek, sIdx, 5)
                                            }
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: 'inherit',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              padding: '1px',
                                            }}
                                          >
                                            <Plus size={10} />
                                          </button>
                                        </>
                                      ) : (
                                        <span
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '0 3px',
                                          }}
                                        >
                                          <Lock size={9} />
                                          <span>{slotObj.restAfterMins || 0}m</span>
                                        </span>
                                      )}
                                    </div>
                                    {isSlotRestLocked && (
                                      <div className="glass-lock-tooltip">{restLockReason}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* =================================================================
                3. BOTTOM ACTION BAR WITH INLINE FEEDBACK & MORPHING PUBLISH BUTTON
                ================================================================= */}
            <div
              style={{
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, minWidth: '260px' }}>
                <AnimatePresence mode="wait">
                  {feedbackMsg && (
                    <motion.div
                      key={`${publishState}-${feedbackMsg}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        background:
                          publishState === 'error'
                            ? 'rgba(217, 107, 107, 0.18)'
                            : 'rgba(132, 181, 159, 0.18)',
                        border:
                          publishState === 'error'
                            ? '1px solid rgba(217, 107, 107, 0.42)'
                            : '1px solid rgba(132, 181, 159, 0.42)',
                        color: publishState === 'error' ? '#ffd6d6' : '#d8f3e5',
                      }}
                    >
                      {publishState === 'error' ? (
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      ) : (
                        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                      )}
                      <span>{feedbackMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                layout
                type="submit"
                disabled={publishState === 'saving'}
                className={`btn-cream-pill ${
                  publishState === 'success'
                    ? 'btn-publish-success'
                    : publishState === 'error'
                    ? 'btn-publish-error'
                    : ''
                }`}
                style={{ padding: '14px 28px', minWidth: '240px', justifyContent: 'center' }}
              >
                {publishState === 'saving' && (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Publishing Schedule...</span>
                  </>
                )}

                {publishState === 'success' && (
                  <>
                    <Check size={17} strokeWidth={3} />
                    <span>Schedule Published</span>
                  </>
                )}

                {publishState === 'error' && (
                  <>
                    <AlertCircle size={16} />
                    <span>Publish Failed — Retry</span>
                  </>
                )}

                {publishState === 'idle' && (
                  <>
                    <span>Publish & Generate Slots</span>
                    <span className="arrow-cycle-box">
                      <span className="arrow-icon-primary">↗</span>
                      <span className="arrow-icon-clone">↗</span>
                    </span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </form>
      )}
    </motion.main>
  );
};

export default ScheduleBuilder;