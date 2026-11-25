import { useEffect, useState } from 'react'
import useAuth from '../../context/useAuth'

function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  }).format(new Date(date))
}
function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(date))
}

export default function Appointments({ onBack }) {
  const { getDoctorAppointments } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getDoctorAppointments()
      .then((data) => {
        if (!active) return
        setAppointments(data.appointments)
        setTimezone(data.timezone || 'Asia/Kolkata')
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [getDoctorAppointments])

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CareConnect home">
          <span className="brand-mark" aria-hidden="true">+</span>
          CareConnect
        </a>
        <button className="secondary-button" type="button" onClick={onBack}>
          Back to dashboard
        </button>
      </header>

      <main className="appointments-layout">
        <div className="appointments-heading">
          <div>
            <p className="eyebrow">DOCTOR DASHBOARD · APPOINTMENTS</p>
            <h1>Upcoming appointments</h1>
            <p>Confirmed patient bookings, shown in {timezone} time.</p>
          </div>
          <span className="appointment-count">
            {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
          </span>
        </div>

        {loading && (
          <p className="schedule-loading" role="status">Loading appointments…</p>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        {!loading && !error && appointments.length === 0 && (
          <section className="appointments-empty">
            <span className="empty-calendar" aria-hidden="true">▦</span>
            <h2>No upcoming appointments</h2>
            <p>Confirmed bookings will appear here when patients schedule a visit.</p>
          </section>
        )}

        {!loading && !error && appointments.length > 0 && (
          <div className="appointment-list">
            {appointments.map((appointment) => {
              const startAt = new Date(appointment.startAt)
              const endAt = new Date(appointment.endAt)

              return (
                <article className="appointment-card" key={appointment.id}>
                  <div className="appointment-date">
                    <span>{formatDate(startAt, timezone)}</span>
                    <strong>
                      {formatTime(startAt, timezone)} – {formatTime(endAt, timezone)}
                    </strong>
                  </div>
                  <div className="appointment-patient">
                    <span className="patient-avatar" aria-hidden="true">
                      {appointment.patientName.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{appointment.patientName}</strong>
                      <span>Patient</span>
                    </div>
                  </div>
                  <div className="appointment-meta">
                    <span className="appointment-mode">
                      {appointment.mode === 'video' ? 'Video consultation' : 'In-person visit'}
                    </span>
                    <span className="appointment-status">Confirmed</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
      <footer className="page-footer">
        Your health information is handled with care.
      </footer>
    </div>
  )
}
