import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Footer from './components/Footer';
import Specialties from './pages/Specialties';
import SecurityPrivacy from './pages/SecurityPrivacy';
import Login from './pages/Login';
import DoctorSearch from './pages/patient/DoctorSearch';
import BookingCheckout from './pages/patient/BookingCheckout';
import PatientDashboard from './pages/patient/PatientDashboard';
import HealthVault from './pages/patient/HealthVault';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import ScheduleBuilder from './pages/doctor/ScheduleBuilder';
import DoctorAnalytics from './pages/doctor/DoctorAnalytics';

const AnimatedPreviewPage = ({ title, subtitle, primaryActionText, primaryActionLink }) => (
  <motion.main
    initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
    transition={{ duration: 0.42, ease: [0.19, 1, 0.22, 1] }}
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px',
    }}
  >
    <div
      className="glass-card"
      style={{
        maxWidth: '760px',
        width: '100%',
        padding: '48px',
      }}
    >
      <h1 className="hero-display-title" style={{ fontSize: '3.2rem', marginBottom: '16px' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--cream-soft)', fontSize: '17px', lineHeight: 1.6, marginBottom: '32px' }}>
        {subtitle}
      </p>
      <Link to={primaryActionLink || '/'} className="btn-cream-pill">
        <span>{primaryActionText || 'Return to Home'}</span>
        <span className="arrow-cycle-box">
          <span className="arrow-icon-primary">↗</span>
          <span className="arrow-icon-clone">↗</span>
        </span>
      </Link>
    </div>
  </motion.main>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public & Auth Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/specialties" element={<Specialties />} />
        <Route path="/security" element={<SecurityPrivacy />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login />} />

        {/* Patient Routes */}
        <Route path="/search" element={<DoctorSearch />} />
        <Route path="/patient/checkout/:doctorId" element={<BookingCheckout />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/appointments" element={<PatientDashboard />} />
        <Route path="/vault" element={<HealthVault/>} />

        {/* Doctor Routes */}
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/schedule" element={<ScheduleBuilder />} />
        <Route path="/doctor/analytics" element={<DoctorAnalytics />} />

        {/* Video Room Preview */}
        <Route
          path="/video"
          element={
            <AnimatedPreviewPage
              title="Instant Video Consultations."
              subtitle="End-to-end encrypted peer-to-peer WebRTC rooms with live digital prescription generation."
              primaryActionText="Explore Specialists"
              primaryActionLink="/search"
            />
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const bgX = useSpring(rawX, { stiffness: 60, damping: 25, mass: 1 });
  const bgY = useSpring(rawY, { stiffness: 60, damping: 25, mass: 1 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * -18;
      const normY = (e.clientY / window.innerHeight - 0.5) * -12;
      rawX.set(normX);
      rawY.set(normY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [rawX, rawY]);

  return (
    <AuthProvider>
      <Router>
        <div className="fluted-app-shell">
          <motion.div
            style={{ x: bgX, y: bgY }}
            className="fluted-light-beams"
          />
          <div className="fluted-light-caustics" />
          <div className="fluted-glass-ribbing" />

          <Navbar />
          <AnimatedRoutes />
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;