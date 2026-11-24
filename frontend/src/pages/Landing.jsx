import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import {
  MapPin,
  Star,
  Check,
  Award,
  Video,
  Building2,
  CalendarHeart,
  FileCheck2,
  Stethoscope,
  Sparkles,
  HeartHandshake,
  CalendarX2,
} from 'lucide-react';
import { api, useAuth } from '../context/AuthContext';

const PLATFORM_STORIES = [
  {
    id: 'specialists',
    label: 'Verified Specialists',
    audienceBadge: 'FOR PATIENTS & FAMILIES',
    title: 'Find the right specialist by city and expertise.',
    description:
      'Search directly across cardiology, dermatology, pediatrics, and general medicine. Review doctor qualifications, clinical experience, and transparent consultation fees before you book.',
    highlightStat: 'Direct Specialist Discovery',
    highlightSub: 'Filter by specialization, city, and consultation mode',
    ctaText: 'Browse Specialists',
    ctaLink: '/search',
    icon: Award,
    topFloatingPill: 'Verified Medical Profile',
    bottomFloatingBadge: 'Transparent Consultation Fees',
    sculptureHeader: 'Specialist Directory',
    sculptureSub: 'Filter by City & Medical Field',
    sculptureItems: [
      { label: 'Qualifications & Clinical Profile', tag: 'Verified' },
      { label: 'Video & In-Person Consultations', tag: 'Available' },
      { label: 'Upfront Consultation Fee Breakdown', tag: 'Clear' },
    ],
  },
  {
    id: 'anywhere',
    label: 'Video & Clinic Care',
    audienceBadge: 'CARE ON YOUR TERMS',
    title: 'Consult from your living room or visit the clinic.',
    description:
      'Connect face-to-face with your doctor over a private, browser-based video call with built-in camera and microphone checks, or schedule a traditional in-person clinic visit.',
    highlightStat: 'Browser-Based Video Rooms',
    highlightSub: 'No external apps or downloads required to join your call',
    ctaText: 'Explore Video Consults',
    ctaLink: '/video',
    icon: Video,
    topFloatingPill: 'Built-In Audio & Video Check',
    bottomFloatingBadge: 'Private Peer-to-Peer Room',
    sculptureHeader: 'Live Video Consultation',
    sculptureSub: 'HD Video Room • Browser Ready',
    sculptureItems: [
      { label: 'Pre-Call Camera & Microphone Tester', tag: 'Built-In' },
      { label: 'Direct Peer-to-Peer Video Stream', tag: 'Private' },
      { label: 'Switch Between Video & Clinic Modes', tag: 'Flexible' },
    ],
  },
  {
    id: 'instant',
    label: 'Real-Time Booking',
    audienceBadge: 'EFFORTLESS SCHEDULING',
    title: 'Pick an open time slot and lock it instantly.',
    description:
      'View live daily and weekly time slots generated directly from the doctor’s schedule. When you review a booking, your slot is held for you so no one else can take it.',
    highlightStat: 'Protected Checkout Hold',
    highlightSub: 'Prevents overlapping appointments while you confirm',
    ctaText: 'Check Open Slots',
    ctaLink: '/search',
    icon: CalendarHeart,
    topFloatingPill: 'Real-Time Calendar Sync',
    bottomFloatingBadge: 'Instant Booking Confirmation',
    sculptureHeader: 'Slot Selection & Hold',
    sculptureSub: 'Morning & Afternoon Windows',
    sculptureItems: [
      { label: 'Live Open Slot Filtering by Date', tag: 'Real-Time' },
      { label: 'Temporary Slot Hold During Checkout', tag: 'Protected' },
      { label: 'Easy Rescheduling & Cancellation', tag: 'Supported' },
    ],
  },
  {
    id: 'prescriptions',
    label: 'Health Records Vault',
    audienceBadge: 'SECURITY & PRIVACY',
    title: 'Digital prescriptions & encrypted health records.',
    description:
      'Keep your consultation notes, prescriptions, and uploaded diagnostic reports organized and encrypted in your personal vault so they are only accessible by you and your doctor.',
    highlightStat: 'Encrypted Patient Vault',
    highlightSub: 'Private access to upcoming calls and medical records',
    ctaText: 'Open Health Vault',
    ctaLink: '/vault',
    icon: FileCheck2,
    topFloatingPill: 'Private Patient Records',
    bottomFloatingBadge: 'Protected Medical History',
    sculptureHeader: 'Patient Health Vault',
    sculptureSub: 'Prescriptions & Diagnostic Files',
    sculptureItems: [
      { label: 'Consultation Notes & Prescriptions', tag: 'Organized' },
      { label: 'Lab Reports & Medical Uploads', tag: 'Encrypted' },
      { label: 'Authorized Doctor Review During Call', tag: 'Seamless' },
    ],
  },
  {
    id: 'doctors',
    label: 'Built for Doctors',
    audienceBadge: 'FOR SPECIALISTS & CLINICS',
    title: 'A calmer, smarter way to run your practice.',
    description:
      'A dedicated clinical console and schedule builder for specialists. Define your weekly working hours, customize slot durations, and launch patient video calls from one clean timeline.',
    highlightStat: 'Custom Schedule Builder',
    highlightSub: 'Set recurring weekly rules, slot lengths, and buffer times',
    ctaText: 'Join as a Specialist',
    ctaLink: '/login?mode=register&role=doctor',
    icon: Stethoscope,
    topFloatingPill: 'Accepting Consultations • Online',
    bottomFloatingBadge: 'Dedicated Specialist Console',
    sculptureHeader: 'Specialist Clinical Console',
    sculptureSub: 'Daily Patient Queue & Schedule Rules',
    sculptureItems: [
      { label: 'Recurring Weekly Availability Builder', tag: 'Custom' },
      { label: 'Chronological Daily Patient Queue', tag: 'Organized' },
      { label: 'One-Click Video Room Launch', tag: 'Integrated' },
    ],
  },
];

const shuffleDoctors = (array) => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

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

const formatFriendlyDay = (dateObj) => {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const tomorrowKey = toLocalDateKey(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  );
  const key = toLocalDateKey(dateObj);
  const shortMonth = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  if (key === todayKey) return `Today, ${shortMonth}`;
  if (key === tomorrowKey) return `Tomorrow, ${shortMonth}`;
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const groupSevenDayDates = (openSlots) => {
  const now = new Date();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 0, 0, 0, 0);
  const map = new Map();

  (openSlots || []).forEach((slot) => {
    const d = getSlotDateObj(slot);
    if (!d || d < now || d >= weekEnd) return;

    const dateKey = toLocalDateKey(d);
    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        label: formatFriendlyDay(d),
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

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);

  const trackRef = useRef(null);
  const lastChapterRef = useRef(0);

  const handleProtectedAction = useCallback(
    (targetPath) => {
      if (!user) {
        if (targetPath.startsWith('/login')) {
          navigate(targetPath);
        } else {
          navigate(`/login?mode=login&redirect=${encodeURIComponent(targetPath)}`);
        }
      } else {
        navigate(targetPath);
      }
    },
    [user, navigate]
  );

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    mass: 0.35,
    restDelta: 0.0005,
  });

  const lineScaleX = useTransform(smoothProgress, [0, 1], [0.13, 1]);
  const sculptureRotateY = useTransform(smoothProgress, [0, 1], [-15, 15]);
  const sculptureRotateX = useTransform(smoothProgress, [0, 0.5, 1], [7, -5, 9]);
  const sculptureFloatY = useTransform(smoothProgress, [0, 0.5, 1], [8, -10, 6]);

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const total = PLATFORM_STORIES.length;
    const nextIdx = latest <= 0.005 ? 0 : Math.min(Math.floor(latest * total), total - 1);
    if (nextIdx !== lastChapterRef.current) {
      lastChapterRef.current = nextIdx;
      setActiveChapter(nextIdx);
    }
  });

  const handleStoryClick = useCallback((index) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const trackTop = window.scrollY + rect.top;
    const scrollable = trackRef.current.offsetHeight - window.innerHeight;
    const targetScroll = trackTop + (index / PLATFORM_STORIES.length) * scrollable + 12;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onNavbarChapterJump = (e) => {
      if (typeof e.detail === 'number') {
        handleStoryClick(e.detail);
      }
    };
    window.addEventListener('vitalise:scroll-chapter', onNavbarChapterJump);
    return () => window.removeEventListener('vitalise:scroll-chapter', onNavbarChapterJump);
  }, [handleStoryClick]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const tiltSpring = { stiffness: 180, damping: 24, mass: 0.6 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [2.5, -2.5]), tiltSpring);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-2.5, 2.5]), tiltSpring);

  const handleWidgetMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleWidgetMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchAvailableDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const searchRes = await api.get('/doctors/search');
        const rawList =
          searchRes.data?.data ||
          searchRes.data?.doctors ||
          (Array.isArray(searchRes.data) ? searchRes.data : []);

        if (!Array.isArray(rawList) || rawList.length === 0) {
          if (isMounted) setAvailableDoctors([]);
          return;
        }

        const enrichedDoctors = await Promise.all(
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
              } catch (slotErr) {
                rawSlots = [];
              }
            }

            const openSlots = (rawSlots || []).filter((s) => {
              if (!s || typeof s !== 'object') return false;
              const status = String(s.status || 'open').toLowerCase();
              return status === 'open' || status === 'available';
            });

            const availableDates = groupSevenDayDates(openSlots);
            if (availableDates.length === 0) return null;

            return {
              ...doc,
              availableDates,
            };
          })
        );

        const validAvailableDoctors = enrichedDoctors.filter(Boolean);
        const randomizedMaxTwo = shuffleDoctors(validAvailableDoctors).slice(0, 2);

        if (isMounted) {
          setAvailableDoctors(randomizedMaxTwo);
        }
      } catch (err) {
        if (isMounted) {
          setAvailableDoctors([]);
        }
      } finally {
        if (isMounted) {
          setLoadingDoctors(false);
        }
      }
    };

    fetchAvailableDoctors();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDayClick = (doctorId, dateKey) => {
    const targetUrl = `/patient/checkout/${doctorId}?date=${encodeURIComponent(dateKey)}`;
    handleProtectedAction(targetUrl);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.11, delayChildren: 0.05 },
    },
  };

  const itemUpVariants = {
    hidden: { opacity: 0, y: 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.65, ease: [0.19, 1, 0.22, 1] },
    },
  };

  const currentStory = PLATFORM_STORIES[activeChapter];
  const StoryIcon = currentStory.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
      style={{ width: '100%' }}
    >
      {/* 1. HERO SECTION */}
      <section
        style={{
          minHeight: 'calc(100vh - 148px)',
          width: '100%',
          padding: '32px 48px 36px 48px',
          display: 'grid',
          gridTemplateColumns: '1.25fr 440px',
          gap: '48px',
        }}
      >
        {/* LEFT COLUMN */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingBottom: '8px',
          }}
        >
          <motion.h1
            variants={itemUpVariants}
            className="hero-display-title"
            style={{ marginBottom: '24px' }}
          >
            Healthcare that
            <br />
            feels effortless.
          </motion.h1>

          <motion.p
            variants={itemUpVariants}
            style={{
              fontSize: '17.5px',
              lineHeight: 1.5,
              color: 'var(--cream-soft)',
              maxWidth: '520px',
              marginBottom: '34px',
              fontWeight: 400,
            }}
          >
            Connect with top specialists, book instant video consultations,
            and manage your health securely. All in one place.
          </motion.p>

          <motion.div
            variants={itemUpVariants}
            style={{ display: 'flex', alignItems: 'center', gap: '28px' }}
          >
            <button
              type="button"
              onClick={() => handleProtectedAction('/search')}
              className="btn-cream-pill"
            >
              <span>Book a consult</span>
              <span className="arrow-cycle-box">
                <span className="arrow-icon-primary">↗</span>
                <span className="arrow-icon-clone">↗</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleProtectedAction('/search')}
              className="explore-link-animated"
              style={{ background: 'none', border: 'none' }}
            >
              <span>Explore specialists</span>
              <span className="arrow-cycle-box">
                <span className="arrow-icon-primary">↗</span>
                <span className="arrow-icon-clone">↗</span>
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN: Live Available Days & Modes Widget (Max 2 Doctors) */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.16, ease: [0.19, 1, 0.22, 1] }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            paddingTop: '14px',
            perspective: '1100px',
          }}
        >
          <motion.div
            onMouseMove={handleWidgetMouseMove}
            onMouseLeave={handleWidgetMouseLeave}
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
              padding: '16px 18px 18px 18px',
              width: '100%',
            }}
            className="glass-widget-outer"
          >
            <div
              style={{
                width: '38px',
                height: '3px',
                borderRadius: '99px',
                background: 'rgba(255, 255, 255, 0.72)',
                margin: '0 auto 14px auto',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '13px',
                color: '#ffffff',
                marginBottom: '14px',
                paddingLeft: '4px',
                fontWeight: 400,
              }}
            >
              <MapPin size={14} strokeWidth={1.8} />
              <span>
                {loadingDoctors
                  ? 'Checking live specialist availability...'
                  : availableDoctors.length > 0
                  ? 'Doctors open this week — pick a day'
                  : 'Live Slot Availability'}
              </span>
            </div>

            {loadingDoctors ? (
              <div
                className="glass-widget-inner"
                style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div
                  style={{
                    width: '60%',
                    height: '16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.14)',
                  }}
                />
                <div
                  style={{
                    width: '40%',
                    height: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <div
                    style={{
                      width: '120px',
                      height: '38px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.14)',
                    }}
                  />
                  <div
                    style={{
                      width: '120px',
                      height: '38px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.09)',
                    }}
                  />
                </div>
              </div>
            ) : availableDoctors.length > 0 ? (
              availableDoctors.map((doc, idx) => {
                const docId = doc._id || doc.id;
                const docName = doc.userId?.name || doc.name || 'Verified Specialist';
                const docSpec =
                  doc.specialisations?.[0]?.name ||
                  doc.specialisation ||
                  'General Medicine';
                // Strict boolean so 0 is never rendered in JSX!
                const hasRating = Number(doc.rating?.avg) > 0;
                const displayDays = (doc.availableDates || []).slice(0, 2);

                return (
                  <div
                    key={docId || idx}
                    className="glass-widget-inner"
                    style={{
                      padding: '16px',
                      marginBottom: idx < availableDoctors.length - 1 ? '12px' : '0px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '17px',
                          fontWeight: 500,
                          color: '#ffffff',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {docName}
                      </span>

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
                        gap: '6px',
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.85)',
                        marginBottom: '14px',
                      }}
                    >
                      <span>{docSpec}</span>
                      {doc.city && (
                        <>
                          <span>•</span>
                          <span>{doc.city}</span>
                        </>
                      )}
                      {hasRating && (
                        <>
                          <span>•</span>
                          <Star size={11} fill="currentColor" />
                          <span>{Number(doc.rating.avg).toFixed(1)}</span>
                        </>
                      )}
                    </div>

                    {/* Available Days with Live Per-Day Mode Label */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {displayDays.map((dObj, dIdx) => {
                        const modeText =
                          dObj.hasVideo && dObj.hasClinic
                            ? 'Video & Clinic'
                            : dObj.hasClinic
                            ? 'In-Clinic'
                            : 'Video';

                        return (
                          <button
                            key={dObj.dateKey}
                            type="button"
                            onClick={() => handleDayClick(docId, dObj.dateKey)}
                            className={`time-slot-btn ${dIdx === 0 ? 'primary' : 'secondary'}`}
                            style={{
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: '2px',
                              padding: '8px 13px',
                              borderRadius: '13px',
                              fontSize: '12.5px',
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{dObj.label}</span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                opacity: dIdx === 0 ? 0.82 : 0.76,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {dObj.hasClinic && !dObj.hasVideo ? (
                                <Building2 size={10} />
                              ) : (
                                <Video size={10} />
                              )}
                              <span>{modeText}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                className="glass-widget-inner"
                style={{
                  padding: '22px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cream)',
                      flexShrink: 0,
                    }}
                  >
                    <CalendarX2 size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15.5px', fontWeight: 500, color: '#ffffff' }}>
                      No instant slots open right now
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.78)' }}>
                      All specialists are currently booked or offline.
                    </div>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: 'rgba(255, 255, 255, 0.82)',
                    marginTop: '2px',
                  }}
                >
                  Sign in to browse full weekly schedules and advance booking windows.
                </p>

                <div style={{ marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleProtectedAction('/search')}
                    className="time-slot-btn primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Check Upcoming Schedules</span>
                    <span>↗</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* 2. UNIFIED STICKY SHOWCASE TRACK */}
      <section ref={trackRef} className="story-chapters-track">
        <div className="story-unified-sticky-viewport">
          <div className="storyteller-bar-surface">
            <motion.div
              style={{
                position: 'absolute',
                top: '-1.5px',
                left: 0,
                width: '100%',
                height: '2px',
                background: 'var(--cream)',
                transformOrigin: 'left center',
                scaleX: lineScaleX,
                willChange: 'transform',
              }}
            />

            {PLATFORM_STORIES.map((story, idx) => {
              const isActive = idx === activeChapter;
              const isCompleted = idx < activeChapter;

              return (
                <div
                  key={story.id}
                  onClick={() => handleStoryClick(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    color: isActive
                      ? '#ffffff'
                      : isCompleted
                      ? 'var(--cream-soft)'
                      : 'var(--cream-muted)',
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ color: 'var(--cream)', fontSize: '15px', lineHeight: 1 }}>
                    +
                  </span>
                  <span>{story.label}</span>
                </div>
              );
            })}
          </div>

          <div className="story-chapters-stage">
            <div
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1.15fr 1fr',
                gap: '64px',
                alignItems: 'center',
              }}
            >
              <div style={{ maxWidth: '580px' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStory.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.09)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        fontSize: '11.5px',
                        fontWeight: 500,
                        letterSpacing: '0.07em',
                        color: 'var(--cream)',
                        marginBottom: '20px',
                      }}
                    >
                      <Sparkles size={12} />
                      <span>{currentStory.audienceBadge}</span>
                    </div>

                    <h2
                      className="hero-display-title"
                      style={{
                        fontSize: 'clamp(2.4rem, 4.1vw, 3.65rem)',
                        marginBottom: '18px',
                      }}
                    >
                      {currentStory.title}
                    </h2>

                    <p
                      style={{
                        fontSize: '16.5px',
                        lineHeight: 1.6,
                        color: 'var(--cream-soft)',
                        marginBottom: '26px',
                      }}
                    >
                      {currentStory.description}
                    </p>

                    <div
                      className="glass-widget-inner"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '15px 20px',
                        borderRadius: '18px',
                        marginBottom: '26px',
                        maxWidth: '470px',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '13px',
                          background: 'var(--cream)',
                          color: 'var(--ink-dark)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <StoryIcon size={20} strokeWidth={2} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>
                          {currentStory.highlightStat}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--cream-soft)', marginTop: '2px' }}>
                          {currentStory.highlightSub}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleProtectedAction(currentStory.ctaLink)}
                      className="btn-cream-pill"
                    >
                      <span>{currentStory.ctaText}</span>
                      <span className="arrow-cycle-box">
                        <span className="arrow-icon-primary">↗</span>
                        <span className="arrow-icon-clone">↗</span>
                      </span>
                    </button>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="sculpture-3d-scene">
                <motion.div
                  style={{
                    rotateY: sculptureRotateY,
                    rotateX: sculptureRotateX,
                    y: sculptureFloatY,
                  }}
                  className="sculpture-3d-assembly"
                >
                  <div className="sculpture-ring-outer" />
                  <div className="sculpture-ring-inner" />
                  <div className="sculpture-back-glass" />

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStory.id}
                      initial={{ opacity: 0, scale: 0.94, rotateY: -10 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      exit={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        transformStyle: 'preserve-3d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        willChange: 'transform, opacity',
                      }}
                    >
                      <div className="sculpture-floating-pill-top">
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: '#84b59f',
                          }}
                        />
                        <span>{currentStory.topFloatingPill}</span>
                      </div>

                      <div className="sculpture-main-glass">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '18px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '17px', fontWeight: 500, color: '#ffffff' }}>
                              {currentStory.sculptureHeader}
                            </div>
                            <div
                              style={{
                                fontSize: '12.5px',
                                color: 'rgba(255, 255, 255, 0.78)',
                                marginTop: '3px',
                              }}
                            >
                              {currentStory.sculptureSub}
                            </div>
                          </div>

                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '12px',
                              background: 'rgba(255, 255, 255, 0.14)',
                              border: '1px solid rgba(255, 255, 255, 0.24)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--cream)',
                            }}
                          >
                            <StoryIcon size={18} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {currentStory.sculptureItems.map((item) => (
                            <div
                              key={item.label}
                              style={{
                                padding: '10px 13px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.09)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                              }}
                            >
                              <span style={{ fontSize: '12.5px', color: '#ffffff' }}>
                                {item.label}
                              </span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  padding: '3px 9px',
                                  borderRadius: '999px',
                                  background: 'rgba(243, 239, 230, 0.16)',
                                  color: 'var(--cream)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.tag}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="sculpture-floating-card-bottom">
                        <HeartHandshake size={15} />
                        <span>{currentStory.bottomFloatingBadge}</span>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default Landing;