import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  FileText,
  Pill,
  Search,
  Calendar,
  Printer,
  Video,
  Building2,
  Stethoscope,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api, useAuth } from '../../context/AuthContext';

const formatReadableDate = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const printPrescriptionSheet = (rx, patientName) => {
  const printWindow = window.open('', '_blank', 'width=820,height=700');
  if (!printWindow) return;

  const medRows = (rx.medicines || [])
    .map(
      (m, i) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-weight:600;">${m.name}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${m.dosage}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${m.frequency}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${m.duration}</td>
      </tr>`
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Vitalise Prescription - ${rx.doctorName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; padding: 36px; max-width: 760px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 24px; }
          .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
          .meta { font-size: 13px; color: #4b5563; line-height: 1.5; }
          .patient-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; display: flex; justify-content: space-between; font-size: 13.5px; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { text-align: left; padding: 10px; background: #f3f4f6; border-bottom: 1px solid #d1d5db; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; }
          .footer { margin-top: 40px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Vitalise Healthcare</div>
            <div class="meta">Digital Prescription • Version ${rx.version}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:600;">${rx.doctorName}</div>
            <div class="meta">${rx.specialisation}${rx.regNumber ? ` • Reg: ${rx.regNumber}` : ''}</div>
            ${rx.clinicAddress ? `<div class="meta">${rx.clinicAddress}</div>` : ''}
          </div>
        </div>

        <div class="patient-box">
          <div><strong>Patient:</strong> ${patientName || 'Patient'}</div>
          <div><strong>Visit Date:</strong> ${formatReadableDate(rx.visitDate)}</div>
          <div><strong>Issued:</strong> ${formatReadableDate(rx.issuedAt)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>${medRows}</tbody>
        </table>

        <div class="footer">
          <span>Generated securely from Vitalise Health Vault</span>
          <span>Encrypted Medical Record</span>
        </div>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const HealthVault = () => {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchVault = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await api.get('/booking/patient/prescriptions');
        const list = res.data?.prescriptions || res.data?.data || [];
        if (isMounted) setPrescriptions(Array.isArray(list) ? list : []);
      } catch (err) {
        if (isMounted) {
          setErrorMsg(err.response?.data?.message || 'Unable to load your Health Vault.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVault();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery.trim()) return prescriptions;
    const kw = searchQuery.toLowerCase();
    return prescriptions.filter((rx) => {
      const matchesDoc = String(rx.doctorName || '').toLowerCase().includes(kw);
      const matchesSpec = String(rx.specialisation || '').toLowerCase().includes(kw);
      const matchesMed = (rx.medicines || []).some((m) =>
        String(m.name || '').toLowerCase().includes(kw)
      );
      return matchesDoc || matchesSpec || matchesMed;
    });
  }, [prescriptions, searchQuery]);

  const totalMedicinesCount = useMemo(
    () => prescriptions.reduce((sum, rx) => sum + (rx.medicines?.length || 0), 0),
    [prescriptions]
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="dashboard-page-container"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '20px',
          marginBottom: '30px',
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
              background: 'rgba(132, 181, 159, 0.16)',
              border: '1px solid rgba(132, 181, 159, 0.35)',
              fontSize: '11.5px',
              letterSpacing: '0.07em',
              color: '#d8f3e5',
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={13} />
            <span>AES-ENCRYPTED PERSONAL RECORDS</span>
          </div>

          <h1 className="hero-display-title" style={{ fontSize: 'clamp(2.2rem, 3.8vw, 3.2rem)' }}>
            Health Vault.
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--cream-soft)', marginTop: '6px' }}>
            All digital prescriptions issued by your specialists, encrypted at rest and ready to
            print anytime.
          </p>
        </div>

        <Link to="/patient/dashboard" className="nav-login-btn" style={{ gap: '8px', padding: '10px 18px' }}>
          <span>My Appointments</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="dashboard-stats-grid" style={{ marginBottom: '26px' }}>
        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>Saved Prescriptions</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {prescriptions.length}
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
            <FileText size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>Prescribed Medicines</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginTop: '4px' }}>
              {totalMedicinesCount}
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
            <Pill size={20} />
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div>
            <div style={{ fontSize: '13px', color: 'var(--cream-soft)' }}>Vault Protection</div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#d8f3e5', marginTop: '8px' }}>
              Encrypted at Rest
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
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {prescriptions.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '24px' }}>
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
              placeholder="Search by medicine name, doctor, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="auth-input-field"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
      )}

      {/* Prescriptions List */}
      {loading ? (
        <div className="glass-card" style={{ padding: '44px' }}>
          <div style={{ fontSize: '15px', color: 'var(--cream-soft)' }}>
            Decrypting your Health Vault...
          </div>
        </div>
      ) : errorMsg ? (
        <div className="glass-card" style={{ padding: '40px', color: '#ffd6d6' }}>
          {errorMsg}
        </div>
      ) : filteredPrescriptions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredPrescriptions.map((rx) => {
            const isVideo = rx.mode === 'video';
            return (
              <div key={rx.id} className="glass-card" style={{ padding: '26px 28px' }}>
                {/* Card Top Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '14px',
                    paddingBottom: '16px',
                    marginBottom: '18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: 'var(--cream)',
                        color: 'var(--ink-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Stethoscope size={21} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '19px', fontWeight: 500, color: '#ffffff' }}>
                          {rx.doctorName}
                        </h2>
                        <span className="qualification-tag-pill">v{rx.version}</span>
                        <span
                          className="qualification-tag-pill"
                          style={{
                            background: isVideo
                              ? 'rgba(132, 181, 159, 0.16)'
                              : 'rgba(243, 239, 230, 0.12)',
                            color: isVideo ? '#d8f3e5' : 'var(--cream)',
                          }}
                        >
                          {isVideo ? <Video size={11} /> : <Building2 size={11} />}
                          <span>{isVideo ? 'Video Consult' : 'In-Clinic'}</span>
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '13.5px',
                          color: 'var(--cream-soft)',
                          marginTop: '4px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <span>{rx.specialisation}</span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} />
                          Visit: {formatReadableDate(rx.visitDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => printPrescriptionSheet(rx, user?.name)}
                    className="btn-cream-pill"
                    style={{ padding: '9px 18px', fontSize: '13px' }}
                  >
                    <Printer size={14} />
                    <span>Print / Save PDF</span>
                  </button>
                </div>

                {/* Structured Medicines Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {(rx.medicines || []).map((med, i) => (
                    <div
                      key={`${rx.id}-${med.name}-${i}`}
                      className="glass-widget-inner"
                      style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '9px',
                            background: 'rgba(132, 181, 159, 0.18)',
                            color: '#d8f3e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Pill size={14} />
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>
                            {med.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--cream-soft)' }}>
                            Dosage: {med.dosage}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="qualification-tag-pill">Freq: {med.frequency}</span>
                        <span className="qualification-tag-pill">Duration: {med.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="glass-card"
          style={{ padding: '48px', textAlign: 'center', maxWidth: '560px', margin: '16px auto' }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 500, color: '#ffffff', marginBottom: '8px' }}>
            {searchQuery.trim()
              ? 'No matching prescriptions found'
              : 'Your Health Vault is empty'}
          </h3>
          <p style={{ fontSize: '14.5px', color: 'var(--cream-soft)', marginBottom: '24px' }}>
            {searchQuery.trim()
              ? 'Try searching with a different doctor or medicine name.'
              : 'Once a specialist completes your consultation and issues a digital prescription, it will appear here automatically.'}
          </p>
          {!searchQuery.trim() && (
            <Link to="/search" className="btn-cream-pill">
              <span>Find a Specialist</span>
              <span className="arrow-cycle-box">
                <span className="arrow-icon-primary">↗</span>
                <span className="arrow-icon-clone">↗</span>
              </span>
            </Link>
          )}
        </div>
      )}
    </motion.main>
  );
};

export default HealthVault;