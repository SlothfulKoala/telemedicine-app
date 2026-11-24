import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  MapPin,
  ExternalLink,
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

const buildMapsUrl = (addressText) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

const BookingCheckout = () => {
  const { doctorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const initialDateParam = searchParams.get('date') || '';

  const [doctor, setDoctor] = useState(null);
  const [sevenDaySlots, setSevenDaySlots] = useState([]);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [dayModeFilter, setDayModeFilter] = useState('all'); // 'all' | 'video' | 'in_person'
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');

  // Silent backend hold happens only when moving from 'select' -> 'review_hold' (no stressful UI timer!)
  const [checkoutStep, setCheckoutStep] = useState('select');
  const [heldAppointmentId, setHeldAppointmentId] = useState(null);

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

  const slotsOnSelectedDay = useMemo(
    () => sevenDaySlots.filter((s) => s.dateKey === selectedDateKey),
    [sevenDaySlots, selectedDateKey]
  );

  // Check if this specific day offers BOTH Video and In-Clinic slots
  const dayHasBothModes = useMemo(() => {
    let hasVideo = false;
    let hasClinic = false;
    slotsOnSelectedDay.forEach((s) => {
      if (String(s.mode || 'video').toLowerCase().includes('person')) hasClinic = true;
      else hasVideo = true;
    });
    return hasVideo && hasClinic;
  }, [slotsOnSelectedDay]);

  const filteredDaySlots = useMemo(() => {
    if (dayModeFilter === 'all') return slotsOnSelectedDay;
    return slotsOnSelectedDay.filter((s) => {
      const isClinic = String(s.mode || 'video').toLowerCase().includes('person');
      return dayModeFilter === 'in_person' ? isClinic : !isClinic;
    });
  }, [slotsOnSelectedDay, dayModeFilter]);

  const dayPeriods = useMemo(() => {
    return [
      {
        id: 'morning',
        label: 'Morning',
        icon: Sun,
        slots: filteredDaySlots.filter((s) => s.hour < 12),
      },
      {
        id: 'afternoon',
        label: 'Afternoon',
        icon: Sunset,
        slots: filteredDaySlots.filter((s) => s.hour >= 12 && s.hour < 17),
      },
      {
        id: 'evening',
        label: 'Evening',
        icon: Moon,
        slots: filteredDaySlots.filter((s) => s.hour >= 17),
      },
    ].filter((period) => period.slots.length > 0);
  }, [filteredDaySlots]);

  const handleSwitchDay = (dateKey) => {
    setSelectedDateKey(dateKey);
    setDayModeFilter('all');
    setErrorMsg('');
    setSearchParams({ date: dateKey }, { replace: true });
    const firstOnDay = sevenDaySlots.find((s) => s.dateKey === dateKey) || null;
    setSelectedSlot(firstOnDay);
  };

  const handleSwitchDayModeFilter = (nextMode) => {
    setDayModeFilter(nextMode);
    const matching = slotsOnSelectedDay.filter((s) => {
      if (nextMode === 'all') return true;
      const isClinic = String(s.mode || 'video').toLowerCase().includes('person');
      return nextMode === 'in_person' ? isClinic : !isClinic;
    });
    if (matching.length > 0 && !matching.some((s) => s._id === selectedSlot?._id)) {
      setSelectedSlot(matching[0]);
    }
  };

  // Silently hold the single chosen slot when patient clicks "Review Booking"
  const handleProceedToReview = async (e) => {
    if (e) e.preventDefault();
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
          'Could not confirm this booking. Please select an available slot again.'
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
  const fullClinicAddress = [doctor?.clinicAddress, docCity].filter(Boolean).join(', ');
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
              marginBottom: selectedModeIsClinic && fullClinicAddress ? '18px' : '28px',
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

          {selectedModeIsClinic && fullClinicAddress && (
            <div
              className="glass-widget-inner"
              style={{
                padding: '14px 18px',
                marginBottom: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                textAlign: 'left',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '13.5px',
                  color: '#ffffff',
                }}
              >
                <MapPin size={15} color="var(--cream)" />
                <span>{fullClinicAddress}</span>
              </span>
              <a
                href={buildMapsUrl(fullClinicAddress)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#d8f3e5',
                  fontSize: '13px',
                  textDecoration: 'underline',
                }}
              >
                <span>Open in Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

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
      {/* Calm Top Navigation Bar (No Countdown Timer) */}
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
          <span>
            {checkoutStep === 'review_hold'
              ? 'Step 3 of 3 • Review & Confirm'
              : 'Step 2 of 3 • Choose a Time'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '48px' }}>
          <div style={{ fontSize: '16px', color: 'var(--cream-soft)' }}>
            Loading open times for {formatDateFriendly(initialDateParam)}...
          </div>
        </div>
      ) : (
        <div className="checkout-grid">
          {/* LEFT PANE */}
          <div className="glass-card" style={{ padding: '34px' }}>
            <AnimatePresence mode="wait">
              {checkoutStep === 'select' ? (
                <motion.form
                  key="step-select"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onSubmit={handleProceedToReview}
                >
                  <h1
                    className="hero-display-title"
                    style={{ fontSize: '2.15rem', marginBottom: '6px' }}
                  >
                    Times for {formatDateFriendly(selectedDateKey)}.
                  </h1>
                  <p style={{ fontSize: '14.5px', color: 'var(--cream-soft)', marginBottom: '22px' }}>
                    Choose a convenient time below, then click{' '}
                    <strong style={{ color: '#ffffff' }}>Review Booking</strong>.
                  </p>

                  {/* Compact Day Switcher */}
                  {availableDates.length > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        paddingBottom: '18px',
                        marginBottom: '20px',
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

                  {/* Quick Mode Filter (Shown automatically when a day offers BOTH Video & In-Clinic) */}
                  {dayHasBothModes && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--cream-muted)' }}>
                        Filter slots:
                      </span>
                      {[
                        { id: 'all', label: 'All Slots' },
                        { id: 'video', label: 'Video Only' },
                        { id: 'in_person', label: 'In-Clinic Only' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSwitchDayModeFilter(opt.id)}
                          className={`time-slot-btn ${
                            dayModeFilter === opt.id ? 'primary' : 'secondary'
                          }`}
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                        >
                          {opt.label}
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

                  {/* Morning / Afternoon / Evening Slots with Explicit Video / In-Clinic Tags */}
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
                                      padding: '9px 14px',
                                      fontSize: '13px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}
                                  >
                                    <span style={{ fontWeight: 500 }}>
                                      {slotItem.formattedTime}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '11px',
                                        padding: '2px 7px',
                                        borderRadius: '999px',
                                        background: isSelected
                                          ? 'rgba(14, 26, 20, 0.14)'
                                          : isClinic
                                          ? 'rgba(243, 239, 230, 0.12)'
                                          : 'rgba(132, 181, 159, 0.18)',
                                        color: isSelected
                                          ? 'var(--ink-dark)'
                                          : isClinic
                                          ? 'var(--cream)'
                                          : '#d8f3e5',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      {isClinic ? <Building2 size={10} /> : <Video size={10} />}
                                      <span>{isClinic ? 'In-Clinic' : 'Video'}</span>
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
                      No open slots match this filter on {formatDateFriendly(selectedDateKey)}.
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
                /* STEP 2: CALM FINAL REVIEW & CONFIRM (NO TIMER PRESSURE) */
                <motion.div
                  key="step-review"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <h1
                    className="hero-display-title"
                    style={{ fontSize: '2.15rem', marginBottom: '8px' }}
                  >
                    Confirm your appointment.
                  </h1>
                  <p style={{ fontSize: '15px', color: 'var(--cream-soft)', marginBottom: '24px' }}>
                    Review your appointment details below and click confirm to finalize.
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
                      <span style={{ color: '#ffffff', fontWeight: 500 }}>
                        {docName} ({docSpec})
                      </span>
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
                    {selectedModeIsClinic && fullClinicAddress && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '14.5px' }}>
                        <span style={{ color: 'var(--cream-soft)' }}>Clinic Location</span>
                        <span style={{ color: '#ffffff', fontWeight: 500, textAlign: 'right' }}>
                          {fullClinicAddress}
                        </span>
                      </div>
                    )}
                    {reason.trim() && (
                      <div
                        style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                          paddingTop: '12px',
                          fontSize: '13.5px',
                          color: 'var(--cream-soft)',
                        }}
                      >
                        <strong>Your Notes:</strong> {reason.trim()}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT SUMMARY CARD */}
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

                {selectedModeIsClinic && fullClinicAddress && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ color: 'var(--cream-soft)' }}>Clinic Address</span>
                    <span style={{ color: '#ffffff', fontWeight: 500, textAlign: 'right' }}>
                      {fullClinicAddress}
                    </span>
                  </div>
                )}

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
                onClick={handleProceedToReview}
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
                    <span>Preparing Review...</span>
                  </>
                ) : (
                  <>
                    <span>Review Booking</span>
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
                disabled={confirming}
                className="btn-cream-pill btn-publish-success"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '14px 24px',
                  opacity: confirming ? 0.65 : 1,
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