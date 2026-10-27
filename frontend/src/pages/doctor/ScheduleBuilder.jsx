import { useEffect, useState } from 'react'
import useAuth from '../../context/useAuth'

const DAYS = [
  { dayOfWeek: 1, name: 'Monday' },
  { dayOfWeek: 2, name: 'Tuesday' },
  { dayOfWeek: 3, name: 'Wednesday' },
  { dayOfWeek: 4, name: 'Thursday' },
  { dayOfWeek: 5, name: 'Friday' },
  { dayOfWeek: 6, name: 'Saturday' },
  { dayOfWeek: 0, name: 'Sunday' },
]

function createDefaultDays(consultationModes = ['video']) {
  return DAYS.map(({ dayOfWeek, name }) => ({
    dayOfWeek,
    name,
    enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: '09:00',
    endTime: '17:00',
    slotMins: 15,
    mode: consultationModes[0] || 'video',
  }))
}

export default function ScheduleBuilder({ onBack }) {
  const { getWeeklySchedule, saveWeeklySchedule } = useAuth()
  const [days, setDays] = useState(() => createDefaultDays())
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30)
  const [consultationModes, setConsultationModes] = useState(['video'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resultMessage, setResultMessage] = useState('')

  useEffect(() => {
    let active = true

    getWeeklySchedule()
      .then((data) => {
        if (!active) return

        const availableModes = data.consultationModes?.length
          ? data.consultationModes
          : ['video']
        const savedRules = new Map(
          data.weeklySchedule.map((rule) => [rule.dayOfWeek, rule]),
        )

        setTimezone(data.timezone)
        setAdvanceBookingDays(data.advanceBookingDays)
        setConsultationModes(availableModes)
        setDays(savedRules.size === 0
          ? createDefaultDays(availableModes)
          : DAYS.map(({ dayOfWeek, name }) => {
            const rule = savedRules.get(dayOfWeek)
            return {
              dayOfWeek,
              name,
              enabled: Boolean(rule),
              startTime: rule?.startTime || '09:00',
              endTime: rule?.endTime || '17:00',
              slotMins: rule?.slotMins || 15,
              mode: rule?.mode || availableModes[0],
            }
          }))
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
  }, [getWeeklySchedule])

  function updateDay(dayOfWeek, property, value) {
    setDays((current) => current.map((day) =>
      day.dayOfWeek === dayOfWeek ? { ...day, [property]: value } : day
    ))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResultMessage('')

    const weeklySchedule = days
      .filter((day) => day.enabled)
      .map(({ dayOfWeek, startTime, endTime, slotMins, mode }) => ({
        dayOfWeek,
        startTime,
        endTime,
        slotMins: Number(slotMins),
        mode,
      }))

    if (weeklySchedule.length === 0) {
      setError('Select at least one day to create a schedule.')
      return
    }

    setSaving(true)
    try {
      const result = await saveWeeklySchedule(weeklySchedule)
      setResultMessage(
        `Schedule saved. ${result.generatedSlots} bookable slots created for the next ${result.advanceBookingDays} days.`,
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

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

      <main className="schedule-layout">
        <section className="profile-setup-intro">
          <p className="eyebrow">DOCTOR DASHBOARD · AVAILABILITY</p>
          <h1>Set your weekly schedule</h1>
          <p>
            Choose the days and hours you see patients. We’ll create individual
            appointment slots using your local time zone.
          </p>
          {!loading && (
            <div className="schedule-details">
              <span><strong>Time zone</strong>{timezone}</span>
              <span>
                <strong>Booking window</strong>
                Next {advanceBookingDays} days
              </span>
            </div>
          )}
        </section>

        <section className="auth-card schedule-card" aria-labelledby="schedule-title">
          <h2 id="schedule-title">Weekly availability</h2>
          <p className="auth-description">
            For example, Monday to Friday, 9 AM–5 PM, with 15-minute appointments.
          </p>

          {loading ? (
            <p className="schedule-loading" role="status">Loading your schedule…</p>
          ) : (
            <form className="schedule-form" onSubmit={handleSubmit}>
              <div className="schedule-days">
                {days.map((day) => (
                  <div
                    className={`schedule-day${day.enabled ? ' is-enabled' : ''}`}
                    key={day.dayOfWeek}
                  >
                    <label className="schedule-day-toggle">
                      <input
                        type="checkbox"
                        checked={day.enabled}
                        onChange={(event) =>
                          updateDay(day.dayOfWeek, 'enabled', event.target.checked)
                        }
                      />
                      <span>{day.name}</span>
                    </label>

                    {day.enabled && (
                      <div className="schedule-day-fields">
                        <label>
                          Start
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(event) =>
                              updateDay(day.dayOfWeek, 'startTime', event.target.value)
                            }
                            required
                          />
                        </label>
                        <label>
                          End
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(event) =>
                              updateDay(day.dayOfWeek, 'endTime', event.target.value)
                            }
                            required
                          />
                        </label>
                        <label>
                          Slot length
                          <select
                            value={day.slotMins}
                            onChange={(event) =>
                              updateDay(day.dayOfWeek, 'slotMins', event.target.value)
                            }
                          >
                            {[15, 20, 30, 45, 60].map((minutes) => (
                              <option key={minutes} value={minutes}>
                                {minutes} min
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Consultation
                          <select
                            value={day.mode}
                            onChange={(event) =>
                              updateDay(day.dayOfWeek, 'mode', event.target.value)
                            }
                          >
                            {consultationModes.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode === 'video' ? 'Video' : 'In person'}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}
              {resultMessage && (
                <p className="schedule-success" role="status">{resultMessage}</p>
              )}
              <div className="schedule-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setDays(createDefaultDays(consultationModes))}
                >
                  Restore weekday defaults
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving ? 'Generating slots…' : 'Save schedule'}
                </button>
              </div>
              <p className="form-hint">
                Saving replaces future open slots generated from your previous
                weekly schedule. Booked appointments are kept.
              </p>
            </form>
          )}
        </section>
      </main>
      <footer className="page-footer">
        Your health information is handled with care.
      </footer>
    </div>
  )
}
