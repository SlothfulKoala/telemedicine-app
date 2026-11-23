import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Video,
  Building2,
  ArrowLeft,
  AlertCircle,
  Check,
  Calendar,
  Sun,
  Sunset,
  Moon,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

const getSlotDateObj = (slot) => {
  if (!slot || typeof slot !== 'object') return null;
  const candidates = [slot.startAt, slot.date, slot.startTime];
  for (const val of candidates) {
    if (!val) continue;
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const toLocalDateKey = (dateObj) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateFriendly = (dateKey) => {
  if (!dateKey) return 'Selected Day';
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateKey;

  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const tomorrowKey = toLocalDateKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  );
  const shortDayMonth = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  if (dateKey === todayKey) return `Today, ${shortDayMonth}`;
  if (dateKey === tomorrowKey) return `Tomorrow, ${shortDayMonth}`;
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const formatSlotTime = (slotItem) => {
  const d = getSlotDateObj(slotItem);
  if (d) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return slotItem?.formattedTime || slotItem?.startTime || 'Slot';
};

const formatFeeInRupees = (rawFee) => {
  if (rawFee === 0 || rawFee === '0') return 0;
  const num = Number(rawFee);
  if (isNaN(num)) return 500;
  return num >= 2000 ? Math.round(num / 100) : num;
};

const BookingCheckout = () => {
  const { doctorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialDateParam = searchParams.get('date') || '';

  const [doctor, setDoctor] = useState(null);
  const [sevenDaySlots, setSevenDaySlots] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');

  // Two-Step Anti-Slot-Hoarding Flow: 'select' (zero locks) -> 'review_hold' (15-min hold active) -> 'confirmed'
  const [checkoutStep, setCheckoutStep] = useState('select');
  const [heldAppointmentId, setHeldAppointmentId] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(900);

  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) {
      const currentUrl = `/patient/checkout/${doctorId}${window.location.search}`;
      navigate(`/login?mode=login&redirect=${encodeURIComponent(currentUrl)}`, { replace: true });
    }
  }, [user, doctorId, navigate]);

  // Countdown runs ONLY when the patient has explicitly locked a slot in Step 2 ('review_hold')!
  useEffect(() => {
    if (checkoutStep !== 'review_hold') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [checkoutStep]);

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  useEffect(() => {
    let isMounted = true;

    const loadDoctorAndSlots = async () => {
      try {
        setLoading(true);
        const [searchRes, slotRes] = await Promise.allSettled([
          api.get('/doctors/search'),
          api.get(`/booking/slots/${doctorId}`),
        ]);

        if (!isMounted) return;

        if (searchRes.status === 'fulfilled') {
          const list = searchRes.value.data?.data || [];
          const foundDoc = list.find((d) => (d._id || d.id) === doctorId) || list[0];
          if (foundDoc) setDoctor(foundDoc);
        }

        const now = new Date();
        const weekEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 7,
          0,
          0,
          0,
          0
        );

        let rawObjs = [];
        if (slotRes.status === 'fulfilled') {
          rawObjs = slotRes.value.data?.data || slotRes.value.data?.slots || [];
        }

        // Keep ONLY open slots within the 7-day rolling window, parsed cleanly via startAt
        const validSlots = rawObjs
          .map((obj) => {
            const d = getSlotDateObj(obj);
            if (!d) return null;
            return {
              ...obj,
              _dateObj: d,
              dateKey: toLocalDateKey(d),
              hour: d.getHours(),
              formattedTime: formatSlotTime(obj),
            };
          })
          .filter((s) => {
            if (!s) return false;
            const st = String(s.status || 'open').toLowerCase();
            return (st === 'open' || st === 'available') && s._dateObj >= now && s._dateObj < weekEnd;
          })
          .sort((a, b) => a._dateObj - b._dateObj);

        setSevenDaySlots(validSlots);

        if (validSlots.length > 0) {
          const uniqueDates = Array.from(new Set(validSlots.map((s) => s.dateKey))).sort();
          const chosenDate =
            initialDateParam && uniqueDates.includes(initialDateParam)
              ? initialDateParam
              : uniqueDates[0];

          setSelectedDateKey(chosenDate);

          const slotsOnDay = validSlots.filter((s) => s.dateKey === chosenDate);
          if (slotsOnDay.length > 0) {
            setSelectedSlot(slotsOnDay[0]);
          }
        }
      } catch (err) {
        if (isMounted) setErrorMsg('Unable to load available time slots.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user) loadDoctorAndSlots();
    return () => {
      isMounted = false;
    };
  }, [doctorId, initialDateParam, user]);

  // Available dates in the 7-day window (for the compact switcher)
  const availableDates = useMemo(() => {
    const map = new Map();
    sevenDaySlots.forEach((s) => {
      if (!map.has(s.dateKey)) {
        map.set(s.dateKey, {
          dateKey: s.dateKey,
          label: formatDateFriendly(s.dateKey),
          count: 0,
        });
      }
      map.get(s.dateKey).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [sevenDaySlots]);

  // Strictly ONLY the slots for the single selected date, grouped into Morning / Afternoon / Evening
  const dayPeriods = useMemo(() => {
    const onDay = sevenDaySlots.filter((s) => s.dateKey === selectedDateKey);
    return [
      {
        id: 'morning',
        label: 'Morning',
        icon: Sun,
        slots: onDay.filter((s) => s.hour < 12),
      },
      {
        id: 'afternoon',
        label: 'Afternoon',
        icon: Sunset,
        slots: onDay.filter((s) => s.hour >= 12 && s.hour < 17),
      },
      {
        id: 'evening',
        label: 'Evening',
        icon: Moon,
        slots: onDay.filter((s) => s.hour >= 17),
      },
    ].filter((period) => period.slots.length > 0);
  }, [sevenDaySlots, selectedDateKey]);

  const handleSwitchDay = (dateKey) => {
    setSelectedDateKey(dateKey);
    setErrorMsg('');
    setSearchParams({ date: dateKey }, { replace: true });
    const firstOnDay = sevenDaySlots.find((s) => s.dateKey === dateKey) || null;
    setSelectedSlot(firstOnDay);
  };

  // STEP 1 -> STEP 2: Lock ONLY the single chosen slot when the patient clicks "Lock Slot & Review Booking"
  const handleProceedToHoldAndReview = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const slotId = selectedSlot?._id || selectedSlot?.id;
    if (!slotId) {
      setErrorMsg('Please pick a time slot first.');
      return;
    }

    setHolding(true);
    try {
      const res = await api.post('/booking/hold', { slotId, doctorId });
      if (res.data?.appointmentId) {
        setHeldAppointmentId(res.data.appointmentId);
      }
      if (res.data?.holdExpiresAt) {
        const diffSecs = Math.max(
          0,
          Math.floor((new Date(res.data.holdExpiresAt).getTime() - Date.now()) / 1000)
        );
        setSecondsLeft(diffSecs > 0 ? diffSecs : 900);
      } else {
        setSecondsLeft(900);
      }
      setCheckoutStep('review_hold');
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          'That slot was just taken by another patient. Please pick the next available time.'
      );
    } finally {
      setHolding(false);
    }
  };

  // STEP 2 -> STEP 3: Final Confirm & Pay Later (or Payment Gateway in v2)
  const handleFinalConfirm = async () => {
    setErrorMsg('');
    const slotId = selectedSlot?._id || selectedSlot?.id;
    const slotMode =
      String(selectedSlot?.mode || 'video').toLowerCase().includes('person')
        ? 'in_person'
        : 'video';

    setConfirming(true);
    try {
      const res = await api.post('/booking/confirm', {
        slotId,
        appointmentId: heldAppointmentId || undefined,
        paymentMethod: 'pay_later',
        paymentStatus: 'pending',
        doctorId: doctor?._id || doctorId,
        mode: slotMode,
        reason: reason.trim(),
        notes: reason.trim(),
      });
      setBookingResult(res.data);
      setCheckoutStep('confirmed');
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          'Could not confirm this booking. Your 15-minute hold may have expired.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const docName = doctor?.userId?.name || doctor?.name || 'Verified Specialist';
  const rawSpec = doctor?.specialisations?.[0];
  const docSpec =
    (typeof rawSpec === 'object' ? rawSpec?.name : rawSpec) ||
    doctor?.specialisation ||
    'General Medicine';
  const docCity = doctor?.city || doctor?.location?.city || 'New Delhi';
  const docFeeRupees = formatFeeInRupees(doctor?.fee);
  const selectedModeIsClinic = String(selectedSlot?.mode || 'video')
    .toLowerCase()
    .includes('person');

  // STEP 3: CONFIRMED SCREEN
  if (checkoutStep === 'confirmed' && bookingResult) {
    const payStatus = bookingResult.payment?.status || 'pending';
    return (
      <motion.main
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="search-page-container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          className="glass-card"
          style={{ maxWidth: '580px', width: '100%', padding: '48px', textAlign: 'center' }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              background: '#84b59f',
              color: '#0e1a14',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 22px auto',
            }}
          >
            <Check size={28} strokeWidth={3} />
          </div>

          <h1 className="hero-display-title" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
            You’re all booked.
          </h1>

          <p
            style={{
              fontSize: '15.5px',
              color: 'var(--cream-soft)',
              lineHeight: 1.65,
              marginBottom: '28px',
            }}
          >
            Your{' '}
            <strong style={{ color: '#ffffff' }}>
              {selectedModeIsClinic ? 'In-Person Clinic Visit' : 'Video Consultation'}
            </strong>{' '}
            with <strong style={{ color: '#ffffff' }}>{docName}</strong> on{' '}
            <strong style={{ color: '#ffffff' }}>{formatDateFriendly(selectedDateKey)}</strong> at{' '}
            <strong style={{ color: '#ffffff' }}>{formatSlotTime(selectedSlot)}</strong> is
            confirmed (Payment: <strong style={{ color: '#d8f3e5' }}>{payStatus}</strong>).
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link to="/patient/dashboard" className="btn-cream-pill">
              <span>View My Appointments</span>
              <span className="arrow-cycle-box">
                <span className="arrow-icon-primary">↗</span>
                <span className="arrow-icon-clone">↗</span>
              </span>
            </Link>
            <Link to="/search" className="btn-glass-pill">
              <span>Find Another Specialist</span>
            </Link>
          </div>
        </div>
      </motion.main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="search-page-container"
    >
      {/* Top Bar: Calm Back Link + Hold Timer (Visible ONLY once patient enters Step 2!) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {checkoutStep === 'review_hold' ? (
          <button
            type="button"
            onClick={() => {
              setCheckoutStep('select');
              setErrorMsg('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--cream-soft)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Change Time Slot</span>
          </button>
        ) : (
          <Link
            to="/search"
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
            <span>Back to Specialists</span>
          </Link>
        )}

        {checkoutStep === 'review_hold' ? (
          <div className="hold-timer-banner">
            <Clock size={15} />
            <span>Slot Reserved for You • {formatTimer(secondsLeft)} to confirm</span>
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              fontSize: '12px',
              color: 'var(--cream-soft)',
            }}
          >
            <ShieldCheck size={14} color="var(--cream)" />
            <span>Step 2 of 3 • Pick a Time</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '48px' }}>
          <div style={{ fontSize: '16px', color: 'var(--cream-soft)' }}>
            Loading open times for {formatDateFriendly(initialDateParam)}...
          </div>
        </div>
      ) : (
        <div className="checkout-grid">
          {/* LEFT PANE: Either Step 1 (Pick Time for Specific Day) OR Step 2 (Final Review & Confirm) */}
          <div className="glass-card" style={{ padding: '34px' }}>
            <AnimatePresence mode="wait">
              {checkoutStep === 'select' ? (
                <motion.form
                  key="step-select"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onSubmit={handleProceedToHoldAndReview}
                >
                  <h1
                    className="hero-display-title"
                    style={{ fontSize: '2.15rem', marginBottom: '6px' }}
                  >
                    Times for {formatDateFriendly(selectedDateKey)}.
                  </h1>
                  <p style={{ fontSize: '14.5px', color: 'var(--cream-soft)', marginBottom: '22px' }}>
                    Choose a convenient time below. Your slot will be reserved when you click{' '}
                    <strong style={{ color: '#ffffff' }}>Lock Slot & Review</strong>.
                  </p>

                  {/* Compact Day Switcher (Strictly shows 1 day's slots at a time!) */}
                  {availableDates.length > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        paddingBottom: '18px',
                        marginBottom: '22px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--cream-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginRight: '4px',
                        }}
                      >
                        <Calendar size={13} />
                        <span>Day:</span>
                      </span>
                      {availableDates.map((d) => (
                        <button
                          key={d.dateKey}
                          type="button"
                          onClick={() => handleSwitchDay(d.dateKey)}
                          className={`time-slot-btn ${
                            d.dateKey === selectedDateKey ? 'primary' : 'secondary'
                          }`}
                          style={{ padding: '6px 13px', fontSize: '12.5px' }}
                        >
                          {d.label} ({d.count})
                        </button>
                      ))}
                    </div>
                  )}

                  {errorMsg && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'rgba(217, 107, 107, 0.16)',
                        border: '1px solid rgba(217, 107, 107, 0.38)',
                        color: '#ffd6d6',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Single-Day Slots Calmly Grouped by Morning / Afternoon / Evening */}
                  {dayPeriods.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginBottom: '26px' }}>
                      {dayPeriods.map((period) => {
                        const PeriodIcon = period.icon;
                        return (
                          <div key={period.id}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: 'var(--cream)',
                                marginBottom: '10px',
                              }}
                            >
                              <PeriodIcon size={14} />
                              <span>{period.label}</span>
                              <span style={{ fontSize: '12px', color: 'var(--cream-muted)', fontWeight: 400 }}>
                                ({period.slots.length} open)
                              </span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
                              {period.slots.map((slotItem) => {
                                const isSelected = selectedSlot?._id === slotItem._id;
                                const isClinic = String(slotItem.mode || 'video')
                                  .toLowerCase()
                                  .includes('person');

                                return (
                                  <button
                                    key={slotItem._id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedSlot(slotItem);
                                      setErrorMsg('');
                                    }}
                                    className={`time-slot-btn ${isSelected ? 'primary' : 'secondary'}`}
                                    style={{
                                      padding: '9px 15px',
                                      fontSize: '13px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '7px',
                                    }}
                                    title={isClinic ? 'In-Person Clinic Slot' : 'Video Consult Slot'}
                                  >
                                    <span>{slotItem.formattedTime}</span>
                                    <span style={{ opacity: 0.72, display: 'inline-flex' }}>
                                      {isClinic ? <Building2 size={12} /> : <Video size={12} />}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '20px',
                        borderRadius: '14px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--cream-soft)',
                        fontSize: '14px',
                        marginBottom: '24px',
                      }}
                    >
                      No open slots left on {formatDateFriendly(selectedDateKey)}. Please choose
                      another day above.
                    </div>
                  )}

                  {/* Optional Symptoms / Notes */}
                  <div className="auth-input-group">
                    <label className="auth-input-label" style={{ fontSize: '13.5px' }}>
                      What brings you in today? (Optional — helps {docName} prepare)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Briefly share your main symptoms or questions..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="auth-input-field"
                      style={{ resize: 'vertical', paddingTop: '12px' }}
                    />
                  </div>
                </motion.form>
              ) : (
                /* STEP 2: CALM FINAL REVIEW & PAYMENT/CONFIRMATION (HOLD ACTIVE!) */
                <motion.div
                  key="step-review"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 13px',
                      borderRadius: '999px',
                      background: 'rgba(132, 181, 159, 0.18)',
                      border: '1px solid rgba(132, 181, 159, 0.4)',
                      color: '#d8f3e5',
                      fontSize: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>Step 3 of 3 • Slot Locked for {formatTimer(secondsLeft)}</span>
                  </div>

                  <h1
                    className="hero-display-title"
                    style={{ fontSize: '2.15rem', marginBottom: '8px' }}
                  >
                    Confirm your appointment.
                  </h1>
                  <p style={{ fontSize: '15px', color: 'var(--cream-soft)', marginBottom: '24px' }}>
                    This time slot is now exclusively held for you. Review your details below and
                    click confirm to finalize.
                  </p>

                  {errorMsg && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'rgba(217, 107, 107, 0.16)',
                        border: '1px solid rgba(217, 107, 107, 0.38)',
                        color: '#ffd6d6',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '20px',
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div
                    className="glass-widget-inner"
                    style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px' }}>
                      <span style={{ color: 'var(--cream-soft)' }}>Specialist</span>
                      <span style={{ color: '#ffffff', fontWeight: 500 }}>{docName} ({docSpec})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px' }}>
                      <span style={{ color: 'var(--cream-soft)' }}>Date & Time</span>
                      <span style={{ color: '#ffffff', fontWeight: 500 }}>
                        {formatDateFriendly(selectedDateKey)} • {formatSlotTime(selectedSlot)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px' }}>
                      <span style={{ color: 'var(--cream-soft)' }}>Consultation Type</span>
                      <span style={{ color: '#ffffff', fontWeight: 500 }}>
                        {selectedModeIsClinic ? 'In-Person Clinic Visit' : 'Online Video Consultation'}
                      </span>
                    </div>
                    {reason.trim() && (
                      <div
                        style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                          paddingTop: '12px',
                          fontSize: '13.5px',
                          color: 'var(--cream-soft)',
                        }}
                      >
                        <strong>Your Notes:</strong> “{reason.trim()}”
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT SUMMARY CARD (Sticky, Clear, Calm Action) */}
          <div className="glass-card" style={{ padding: '32px', height: 'fit-content' }}>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '0.07em',
                color: 'var(--cream-muted)',
                marginBottom: '16px',
              }}
            >
              APPOINTMENT SUMMARY
            </div>

            <div className="glass-widget-inner" style={{ padding: '18px', marginBottom: '20px' }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff' }}>{docName}</div>
              <div style={{ fontSize: '13.5px', color: 'var(--cream-soft)', marginTop: '4px' }}>
                {docSpec} • {docCity}
              </div>

              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                  marginTop: '14px',
                  paddingTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13.5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cream-soft)' }}>Date</span>
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>
                    {formatDateFriendly(selectedDateKey)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cream-soft)' }}>Time</span>
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>
                    {selectedSlot ? formatSlotTime(selectedSlot) : '—'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cream-soft)' }}>Mode</span>
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>
                    {selectedModeIsClinic ? 'In-Person Clinic' : 'Video Consult'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cream-soft)' }}>Payment</span>
                  <span style={{ color: '#d8f3e5', fontWeight: 500 }}>
                    {docFeeRupees === 0 ? 'Waived (Free)' : 'Pay Later'}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '17px',
                fontWeight: 600,
                color: '#ffffff',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
                marginBottom: '20px',
              }}
            >
              <span>Consultation Fee</span>
              <span>₹{docFeeRupees}</span>
            </div>

            {checkoutStep === 'select' ? (
              <button
                type="button"
                onClick={handleProceedToHoldAndReview}
                disabled={holding || !selectedSlot}
                className="btn-cream-pill"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '14px 24px',
                  opacity: holding || !selectedSlot ? 0.65 : 1,
                }}
              >
                {holding ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Reserving Slot...</span>
                  </>
                ) : (
                  <>
                    <span>Lock Slot & Review Booking</span>
                    <span className="arrow-cycle-box">
                      <span className="arrow-icon-primary">↗</span>
                      <span className="arrow-icon-clone">↗</span>
                    </span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={confirming || secondsLeft === 0}
                className="btn-cream-pill btn-publish-success"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '14px 24px',
                  opacity: confirming || secondsLeft === 0 ? 0.65 : 1,
                }}
              >
                {confirming ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Confirming Appointment...</span>
                  </>
                ) : (
                  <>
                    <Check size={17} strokeWidth={3} />
                    <span>Confirm Appointment (Pay Later)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.main>
  );
};

export default BookingCheckout;