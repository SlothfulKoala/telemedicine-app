import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle2,
  Video,
  Building2,
  Sparkles,
  ArrowLeft,
  Receipt,
} from 'lucide-react';
import { api } from '../../context/AuthContext';

const formatRupees = (paise) => {
  const num = Number(paise || 0);
  const rupees = Math.round(num / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
};

const formatShortDate = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const DoctorAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get('/booking/doctor/analytics');
        if (isMounted) setData(res.data);
      } catch (err) {
        if (isMounted) {
          setErrorMsg(err.response?.data?.message || 'Unable to load earnings analytics.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  const kpis = data?.kpis || {
    lifetimeEarnings: 0,
    weeklyEarnings: 0,
    pendingDues: 0,
    totalCompleted: 0,
    totalUpcoming: 0,
    completionRate: 0,
    videoCount: 0,
    inPersonCount: 0,
  };

  const trends = data?.weeklyTrends || [];
  const maxBookings = Math.max(1, ...trends.map((t) => t.bookings));
  const maxEarnings = Math.max(10000, ...trends.map((t) => t.earnings));
  const totalModeConsults = kpis.videoCount + kpis.inPersonCount;
  const videoPercent =
    totalModeConsults > 0 ? Math.round((kpis.videoCount / totalModeConsults) * 100) : 50;
  const clinicPercent = totalModeConsults > 0 ? 100 - videoPercent : 50;

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="dashboard-page-container"
    >
      <div style={{ marginBottom: '20px' }}>
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
      <div style={{ marginBottom: '30px' }}>
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
          <span>PRACTICE INSIGHTS • LIVE LEDGER</span>
        </div>

        <h1 className="hero-display-title" style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.1rem)' }}>
          Earnings & Analytics.
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--cream-soft)', marginTop: '6px' }}>
          Track your lifetime consultation income, 7-day booking volume, pending Pay Later dues, and
          payment records.
        </p>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: '44px' }}>
          <div style={{ fontSize: '15px', color: 'var(--cream-soft)' }}>
            Calculating live practice analytics...
          </div>
        </div>
      ) : errorMsg ? (
        <div className="glass-card" style={{ padding: '40px', color: '#ffd6d6' }}>
          {errorMsg}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {/* 1. 4 KPI CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '18px',
            }}
          >
            <div className="dashboard-stat-card">
              <div>
                <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>Lifetime Income</div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
                  {formatRupees(kpis.lifetimeEarnings)}
                </div>
                <div style={{ fontSize: '12px', color: '#d8f3e5', marginTop: '4px' }}>
                  {kpis.totalCompleted} completed consults
                </div>
              </div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  background: 'rgba(132, 181, 159, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d8f3e5',
                }}
              >
                <IndianRupee size={20} />
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div>
                <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
                  This Week’s Income
                </div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
                  {formatRupees(kpis.weeklyEarnings)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--cream-muted)', marginTop: '4px' }}>
                  Rolling last 7 days
                </div>
              </div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  background: 'rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cream)',
                }}
              >
                <TrendingUp size={20} />
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div>
                <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>
                  Pending (Pay Later)
                </div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
                  {formatRupees(kpis.pendingDues)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--cream-muted)', marginTop: '4px' }}>
                  Collect at clinic / completion
                </div>
              </div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  background: 'rgba(243, 239, 230, 0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cream)',
                }}
              >
                <Clock size={20} />
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div>
                <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>Completion Rate</div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
                  {kpis.completionRate}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--cream-muted)', marginTop: '4px' }}>
                  {kpis.totalUpcoming} upcoming in queue
                </div>
              </div>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '13px',
                  background: 'rgba(132, 181, 159, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d8f3e5',
                }}
              >
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>

          {/* 2. TWO 7-DAY TREND GRAPHS SIDE BY SIDE */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '22px',
            }}
          >
            {/* Weekly Booking Trends Bar Chart */}
            <div className="glass-card" style={{ padding: '26px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17.5px', fontWeight: 500, color: '#ffffff' }}>
                  Weekly Booking Trends
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--cream-muted)', marginTop: '2px' }}>
                  Confirmed & completed appointments over the last 7 days
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '10px',
                  alignItems: 'end',
                  height: '180px',
                  paddingTop: '16px',
                }}
              >
                {trends.map((day) => {
                  const pct = Math.max(8, Math.round((day.bookings / maxBookings) * 100));
                  return (
                    <div
                      key={day.dateKey}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff' }}>
                        {day.bookings}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          width: '100%',
                          maxWidth: '34px',
                          borderRadius: '10px 10px 4px 4px',
                          background:
                            day.bookings > 0
                              ? 'linear-gradient(180deg, #F3EFE6 0%, rgba(243, 239, 230, 0.45) 100%)'
                              : 'rgba(255, 255, 255, 0.08)',
                        }}
                      />
                      <span style={{ fontSize: '11.5px', color: 'var(--cream-muted)' }}>
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly Income Trends Bar Chart */}
            <div className="glass-card" style={{ padding: '26px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '17.5px', fontWeight: 500, color: '#ffffff' }}>
                  Weekly Income Trends
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--cream-muted)', marginTop: '2px' }}>
                  Captured consultation revenue (₹) over the last 7 days
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '10px',
                  alignItems: 'end',
                  height: '180px',
                  paddingTop: '16px',
                }}
              >
                {trends.map((day) => {
                  const pct =
                    day.earnings > 0
                      ? Math.max(12, Math.round((day.earnings / maxEarnings) * 100))
                      : 8;
                  return (
                    <div
                      key={day.dateKey}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        height: '100%',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#d8f3e5' }}>
                        {day.earnings > 0 ? formatRupees(day.earnings) : '₹0'}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          width: '100%',
                          maxWidth: '34px',
                          borderRadius: '10px 10px 4px 4px',
                          background:
                            day.earnings > 0
                              ? 'linear-gradient(180deg, #84b59f 0%, rgba(132, 181, 159, 0.35) 100%)'
                              : 'rgba(255, 255, 255, 0.08)',
                        }}
                      />
                      <span style={{ fontSize: '11.5px', color: 'var(--cream-muted)' }}>
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. CONSULTATION MODE SPLIT */}
          <div className="glass-card" style={{ padding: '24px 28px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#ffffff' }}>
                Consultation Mode Distribution
              </h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--cream-soft)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Video size={14} color="#84b59f" />
                  Video: <strong style={{ color: '#ffffff' }}>{kpis.videoCount}</strong> ({videoPercent}%)
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} color="var(--cream)" />
                  In-Clinic: <strong style={{ color: '#ffffff' }}>{kpis.inPersonCount}</strong> ({clinicPercent}%)
                </span>
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.12)',
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              <div style={{ width: `${videoPercent}%`, background: '#84b59f', transition: 'width 0.4s ease' }} />
              <div style={{ width: `${clinicPercent}%`, background: 'var(--cream)', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* 4. RECENT PAYMENT LEDGER */}
          <div className="glass-card" style={{ padding: '26px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <Receipt size={18} color="var(--cream)" />
              <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#ffffff' }}>
                Recent Payment Ledger
              </h2>
            </div>

            {(data?.recentPayments || []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.recentPayments.map((row) => {
                  const isPaid = row.status === 'captured' || row.status === 'waived';
                  return (
                    <div
                      key={row.id}
                      className="glass-widget-inner"
                      style={{
                        padding: '14px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>
                          {row.patientName}
                        </div>
                        <div
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--cream-muted)',
                            marginTop: '3px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                          }}
                        >
                          <span>{formatShortDate(row.appointmentDate)}</span>
                          <span>•</span>
                          <span>{row.mode === 'in_person' ? 'In-Clinic' : 'Video'}</span>
                          <span>•</span>
                          <span>Method: {row.method}</span>
                          <span>•</span>
                          <span>Ref: {row.transactionId}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '15.5px', fontWeight: 600, color: '#ffffff' }}>
                          {formatRupees(row.amount)}
                        </span>
                        <span
                          className="qualification-tag-pill"
                          style={{
                            background: isPaid
                              ? 'rgba(132, 181, 159, 0.18)'
                              : 'rgba(243, 239, 230, 0.12)',
                            borderColor: isPaid
                              ? 'rgba(132, 181, 159, 0.4)'
                              : 'rgba(243, 239, 230, 0.25)',
                            color: isPaid ? '#d8f3e5' : 'var(--cream)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {row.status === 'captured' ? 'Paid' : row.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: 'var(--cream-muted)' }}>
                No payment transactions recorded yet.
              </div>
            )}
          </div>
        </div>
      )}
    </motion.main>
  );
};

export default DoctorAnalytics;