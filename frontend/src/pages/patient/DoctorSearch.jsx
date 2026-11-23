import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Star,
  Check,
  Video,
  Building2,
  ChevronDown,
  RotateCcw,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

const SPECIALTY_FILTERS = [
  'All Specialties',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'General Medicine',
  'Neurology',
  'Orthopedics',
  'Gynecology & Obstetrics',
  'Psychiatry & Mental Health',
  'Ophthalmology',
  'ENT (Otolaryngology)',
  'Gastroenterology',
  'Endocrinology & Diabetes',
];

const MODE_FILTERS = [
  { label: 'All Modes', value: 'all' },
  { label: 'Video Consult', value: 'video' },
  { label: 'In-Person Clinic', value: 'in_person' },
];

// Safely extract a valid JS Date from a MongoDB Slot object (prioritizing startAt!)
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

const formatFriendlyDateLabel = (dateObj) => {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowKey = toLocalDateKey(tomorrow);
  const key = toLocalDateKey(dateObj);

  const shortDayMonth = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  if (key === todayKey) return `Today, ${shortDayMonth}`;
  if (key === tomorrowKey) return `Tomorrow, ${shortDayMonth}`;
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

// Group open slots within the rolling 7-day window (Today through Today + 6 days)
const groupSevenDaySlotsByDate = (openSlots) => {
  const now = new Date();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 0, 0, 0, 0);
  const map = new Map();

  (openSlots || []).forEach((slot) => {
    const d = getSlotDateObj(slot);
    if (!d) return;
    // Strictly keep slots from now up to the end of the 7-day rolling window
    if (d < now || d >= weekEnd) return;

    const dateKey = toLocalDateKey(d);
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        label: formatFriendlyDateLabel(d),
        count: 0,
        hasVideo: false,
        hasClinic: false,
      });
    }
    const entry = map.get(dateKey);
    entry.count += 1;
    const m = String(slot.mode || 'video').toLowerCase();
    if (m.includes('person') || m.includes('clinic')) entry.hasClinic = true;
    else entry.hasVideo = true;
  });

  return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
};

const FilterGlassSelect = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="auth-input-group" ref={ref} style={{ zIndex: open ? 90 : 1 }}>
      <label className="auth-input-label">{label}</label>
      <div className="custom-glass-select-wrapper">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`custom-glass-select-trigger ${open ? 'is-open' : ''}`}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value}
          </span>
          <ChevronDown size={15} style={{ flexShrink: 0 }} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="custom-glass-select-menu"
            >
              {options.map((opt) => {
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                const optVal = typeof opt === 'object' ? opt.value : opt;
                const isSelected = optVal === value || optLabel === value;
                return (
                  <button
                    key={optVal}
                    type="button"
                    onClick={() => {
                      onChange(optVal);
                      setOpen(false);
                    }}
                    className={`custom-glass-select-option ${isSelected ? 'selected' : ''}`}
                  >
                    <span>{optLabel}</span>
                    {isSelected && <Check size={13} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const formatQualificationsList = (rawQuals) => {
  if (!rawQuals) return ['MBBS'];
  if (Array.isArray(rawQuals)) {
    const formatted = rawQuals
      .map((item) => {
        if (!item) return null;
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') {
          const deg = item.degree || item.name || item.title || '';
          const inst = item.institute || item.college || '';
          const isGeneric =
            !inst ||
            inst.toLowerCase().includes('verified medical') ||
            inst.toLowerCase() === 'medical institute';
          if (deg && !isGeneric) return `${deg} (${inst})`;
          if (deg) return String(deg);
        }
        return null;
      })
      .filter(Boolean);
    return formatted.length > 0 ? formatted : ['Verified Specialist'];
  }
  if (typeof rawQuals === 'string') {
    return rawQuals.split(',').map((q) => q.trim()).filter(Boolean);
  }
  return ['MBBS'];
};

const getDoctorSpecialtiesArray = (doc) => {
  const list = [];
  if (Array.isArray(doc.specialisations)) {
    doc.specialisations.forEach((item) => {
      if (typeof item === 'string') list.push(item.trim());
      else if (item && typeof item === 'object') {
        const name = item.name || item.title || item.specialisation;
        if (name) list.push(String(name).trim());
      }
    });
  }
  if (doc.specialisation && typeof doc.specialisation === 'string') {
    list.push(doc.specialisation.trim());
  }
  return list.length > 0 ? Array.from(new Set(list)) : ['General Medicine'];
};

const getModeBadgeFromSlots = (sevenDaySlots) => {
  const modes = new Set(
    (sevenDaySlots || []).map((s) => String(s.mode || 'video').toLowerCase())
  );
  const hasVideo = Array.from(modes).some((m) => m.includes('video') || m.includes('online'));
  const hasClinic = Array.from(modes).some(
    (m) => m.includes('person') || m.includes('clinic') || m.includes('physical')
  );

  if (hasVideo && hasClinic) return { label: 'Video & In-Person', hasVideo: true, hasClinic: true };
  if (hasClinic) return { label: 'In-Person Clinic', hasVideo: false, hasClinic: true };
  return { label: 'Video Consult', hasVideo: true, hasClinic: false };
};

const DoctorSearch = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const urlSpecParam = searchParams.get('specialisation') || '';
  const initialSpecialty = useMemo(() => {
    if (!urlSpecParam) return 'All Specialties';
    const lower = urlSpecParam.toLowerCase();
    const matched = SPECIALTY_FILTERS.find(
      (s) => s !== 'All Specialties' && s.toLowerCase().includes(lower)
    );
    return matched || 'All Specialties';
  }, [urlSpecParam]);

  const [keyword, setKeyword] = useState('');
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [city, setCity] = useState('');
  const [modeFilter, setModeFilter] = useState('all');

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateByDoc, setSelectedDateByDoc] = useState({});

  useEffect(() => {
    let isMounted = true;

    const loadSpecialistsAndSevenDaySlots = async () => {
      try {
        setLoading(true);
        const res = await api.get('/doctors/search');
        const rawList =
          res.data?.data ||
          res.data?.doctors ||
          (Array.isArray(res.data) ? res.data : []);

        if (!Array.isArray(rawList) || rawList.length === 0) {
          if (isMounted) setDoctors([]);
          return;
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

        const enriched = await Promise.all(
          rawList.map(async (doc) => {
            const docId = doc._id || doc.id;
            let rawSlots = [];

            if (docId) {
              try {
                const slotRes = await api.get(`/booking/slots/${docId}`);
                rawSlots =
                  slotRes.data?.data ||
                  slotRes.data?.slots ||
                  (Array.isArray(slotRes.data) ? slotRes.data : []);
              } catch (e) {
                rawSlots = [];
              }
            }

            // Strictly keep ONLY truly FREE ('open') slots within the rolling 7-day window
            const sevenDayOpenSlots = (rawSlots || []).filter((s) => {
              if (!s || typeof s !== 'object') return false;
              const status = String(s.status || 'open').toLowerCase();
              if (status !== 'open' && status !== 'available') return false;
              const d = getSlotDateObj(s);
              return Boolean(d && d >= now && d < weekEnd);
            });

            const availableDates = groupSevenDaySlotsByDate(sevenDayOpenSlots);
            const modeInfo = getModeBadgeFromSlots(sevenDayOpenSlots);

            return {
              ...doc,
              sevenDayOpenSlots,
              availableDates,
              modeInfo,
            };
          })
        );

        // RULE: Do NOT show doctors at all if they have 0 free slots in the next 7 days!
        const availableOnly = enriched.filter((d) => d.availableDates.length > 0);

        if (isMounted) {
          setDoctors(availableOnly);
          const initialDates = {};
          availableOnly.forEach((d) => {
            const dId = d._id || d.id;
            if (d.availableDates?.length > 0) {
              initialDates[dId] = d.availableDates[0].dateKey;
            }
          });
          setSelectedDateByDoc(initialDates);
        }
      } catch (err) {
        if (isMounted) setDoctors([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSpecialistsAndSevenDaySlots();
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const filteredDoctors = useMemo(() => {
    return doctors
      .map((doc) => {
        // If user filtered by Video or In-Person, only count slots matching that mode
        const modeScopedSlots =
          modeFilter === 'all'
            ? doc.sevenDayOpenSlots
            : doc.sevenDayOpenSlots.filter((s) => {
                const m = String(s.mode || 'video').toLowerCase();
                return modeFilter === 'in_person'
                  ? m.includes('person') || m.includes('clinic')
                  : !m.includes('person') && !m.includes('clinic');
              });

        return {
          ...doc,
          scopedDates: groupSevenDaySlotsByDate(modeScopedSlots),
        };
      })
      .filter((doc) => {
        // Hide doctor if they have no free slots left for the chosen mode/week
        if (doc.scopedDates.length === 0) return false;

        const name = String(doc.userId?.name || doc.name || '').toLowerCase();
        const allSpecs = getDoctorSpecialtiesArray(doc).map((s) => s.toLowerCase());
        const specJoined = allSpecs.join(' ');
        const docCity = String(doc.city || doc.location?.city || '').toLowerCase();

        if (keyword.trim()) {
          const kw = keyword.toLowerCase();
          if (!name.includes(kw) && !specJoined.includes(kw) && !docCity.includes(kw)) {
            return false;
          }
        }

        if (specialty !== 'All Specialties') {
          const target = specialty.toLowerCase().split(' ')[0];
          if (!allSpecs.some((s) => s.includes(target) || target.includes(s))) {
            return false;
          }
        }

        if (city.trim() && !docCity.includes(city.trim().toLowerCase())) {
          return false;
        }

        return true;
      });
  }, [doctors, keyword, specialty, city, modeFilter]);

  const handleResetFilters = () => {
    setKeyword('');
    setSpecialty('All Specialties');
    setCity('');
    setModeFilter('all');
    setSearchParams({}, { replace: true });
  };

  const handleProceedToCheckout = (doc, explicitDateKey) => {
    const docId = doc._id || doc.id;
    const validDates = doc.scopedDates || doc.availableDates || [];
    const chosenDate =
      explicitDateKey ||
      (validDates.some((d) => d.dateKey === selectedDateByDoc[docId])
        ? selectedDateByDoc[docId]
        : validDates[0]?.dateKey || '');

    const checkoutUrl = `/patient/checkout/${docId}${
      chosenDate ? `?date=${encodeURIComponent(chosenDate)}` : ''
    }`;

    if (!user) {
      navigate(`/login?mode=login&redirect=${encodeURIComponent(checkoutUrl)}`);
    } else {
      navigate(checkoutUrl);
    }
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="search-page-container"
    >
      {/* Calm Header & 3-Step Guidance Strip */}
      <div style={{ marginBottom: '26px' }}>
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
            marginBottom: '14px',
          }}
        >
          <Sparkles size={12} />
          <span>STEP 1 OF 3 • ONLY SPECIALISTS WITH OPEN SLOTS THIS WEEK</span>
        </div>

        <h1
          className="hero-display-title"
          style={{ fontSize: 'clamp(2.3rem, 4vw, 3.4rem)', marginBottom: '10px' }}
        >
          Find available care right now.
        </h1>

        <p style={{ fontSize: '15.5px', color: 'var(--cream-soft)', maxWidth: '650px' }}>
          We only show verified doctors with confirmed open slots over the next 7 days. Pick a day
          below to see that day’s exact time slots.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="search-filter-bar">
        <div className="auth-input-group">
          <label className="auth-input-label">Search Doctor or Condition</label>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--cream-muted)',
              }}
            />
            <input
              type="text"
              placeholder="e.g. Cardiology, Dermatology..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="auth-input-field"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>

        <FilterGlassSelect
          label="Medical Specialty"
          value={specialty}
          options={SPECIALTY_FILTERS}
          onChange={(val) => setSpecialty(val)}
        />

        <div className="auth-input-group">
          <label className="auth-input-label">City / Location</label>
          <div style={{ position: 'relative' }}>
            <MapPin
              size={15}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--cream-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Any city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="auth-input-field"
              style={{ paddingLeft: '38px' }}
            />
          </div>
        </div>

        <FilterGlassSelect
          label="Consultation Mode"
          value={MODE_FILTERS.find((m) => m.value === modeFilter)?.label || 'All Modes'}
          options={MODE_FILTERS}
          onChange={(val) => setModeFilter(val)}
        />

        <button
          type="button"
          onClick={handleResetFilters}
          className="nav-login-btn"
          style={{ height: '46px', gap: '7px', padding: '0 18px' }}
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="doctor-cards-grid">
          {[1, 2].map((n) => (
            <div key={n} className="doctor-directory-card" style={{ minHeight: '260px' }} />
          ))}
        </div>
      ) : filteredDoctors.length > 0 ? (
        <div className="doctor-cards-grid">
          {filteredDoctors.map((doc) => {
            const docId = doc._id || doc.id;
            const docName = String(doc.userId?.name || doc.name || 'Verified Specialist');
            const docSpec = getDoctorSpecialtiesArray(doc).join(', ');
            const docCity = String(doc.city || doc.location?.city || 'New Delhi');
            const rawFee = Number(doc.fee ?? doc.consultationFee ?? 50000);
            const docFee = rawFee >= 2000 ? Math.round(rawFee / 100) : rawFee;

            const avgRating = Number(
              typeof doc.rating === 'object' ? doc.rating?.avg : doc.rating
            );
            const hasValidRating = !isNaN(avgRating) && avgRating > 0;

            const qualList = formatQualificationsList(doc.qualifications || doc.qualification);
            const availableDates = doc.scopedDates || doc.availableDates || [];
            const selectedDateKey = availableDates.some(
              (d) => d.dateKey === selectedDateByDoc[docId]
            )
              ? selectedDateByDoc[docId]
              : availableDates[0]?.dateKey;
            const selectedDateObj = availableDates.find((d) => d.dateKey === selectedDateKey);

            return (
              <div key={docId} className="doctor-directory-card">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2
                          style={{
                            fontSize: '20px',
                            fontWeight: 500,
                            color: '#ffffff',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {docName}
                        </h2>
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--cream)',
                            color: 'var(--ink-dark)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          title="Verified Specialist"
                        >
                          <Check size={11} strokeWidth={3} />
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          fontSize: '13.5px',
                          color: 'var(--cream-soft)',
                          marginTop: '4px',
                        }}
                      >
                        <span style={{ color: '#ffffff', fontWeight: 500 }}>{docSpec}</span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} />
                          {docCity}
                        </span>
                        {hasValidRating && (
                          <>
                            <span>•</span>
                            <span
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Star size={12} fill="currentColor" />
                              {avgRating.toFixed(1)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '6px 13px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textAlign: 'right',
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>
                        ₹{docFee}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--cream-muted)' }}>per visit</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    {qualList.map((qText, i) => (
                      <span key={`${qText}-${i}`} className="qualification-tag-pill">
                        {qText}
                      </span>
                    ))}

                    <span
                      className="qualification-tag-pill"
                      style={{
                        background: 'rgba(132, 181, 159, 0.16)',
                        borderColor: 'rgba(132, 181, 159, 0.35)',
                        color: '#d8f3e5',
                      }}
                    >
                      {doc.modeInfo?.hasVideo ? <Video size={11} /> : <Building2 size={11} />}
                      <span>{doc.modeInfo?.label || 'Video Consult'}</span>
                    </span>
                  </div>
                </div>

                {/* Rolling 7-Day Available Dates */}
                <div
                  style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.14)',
                    paddingTop: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '10px',
                      fontSize: '12.5px',
                      color: 'var(--cream-soft)',
                    }}
                  >
                    <Calendar size={14} />
                    <span>
                      Open on {availableDates.length} day{availableDates.length > 1 ? 's' : ''} this
                      week — pick a day:
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableDates.map((dObj) => {
                      const isSelected = selectedDateKey === dObj.dateKey;
                      return (
                        <button
                          key={dObj.dateKey}
                          type="button"
                          onClick={() =>
                            setSelectedDateByDoc((prev) => ({
                              ...prev,
                              [docId]: dObj.dateKey,
                            }))
                          }
                          className={`time-slot-btn ${isSelected ? 'primary' : 'secondary'}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 13px',
                            fontSize: '12.5px',
                          }}
                        >
                          <span>{dObj.label}</span>
                          <span style={{ fontSize: '11px', opacity: 0.78 }}>
                            • {dObj.count} free
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Clear CTA */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleProceedToCheckout(doc, selectedDateKey)}
                    className="btn-cream-pill"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '12px 20px',
                    }}
                  >
                    <span>
                      {selectedDateObj
                        ? `See Times for ${selectedDateObj.label}`
                        : 'See Available Times'}
                    </span>
                    <span className="arrow-cycle-box">
                      <span className="arrow-icon-primary">↗</span>
                      <span className="arrow-icon-clone">↗</span>
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="glass-card"
          style={{
            padding: '48px',
            textAlign: 'center',
            maxWidth: '580px',
            margin: '24px auto',
          }}
        >
          <h3 style={{ fontSize: '22px', fontWeight: 500, color: '#ffffff', marginBottom: '10px' }}>
            No specialists with free slots found
          </h3>
          <p style={{ fontSize: '15px', color: 'var(--cream-soft)', marginBottom: '24px' }}>
            We only display doctors with open appointments in the next 7 days. Try clearing your
            filters to view all currently available specialists.
          </p>
          <button type="button" onClick={handleResetFilters} className="btn-cream-pill">
            <span>Show All Available Specialists</span>
          </button>
        </div>
      )}
    </motion.main>
  );
};

export default DoctorSearch;