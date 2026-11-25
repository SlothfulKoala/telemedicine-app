import { useState } from 'react'
import useAuth from '../context/useAuth'

export default function DoctorProfileSetup({ onLogout }) {
  const { completeDoctorProfile } = useAuth()
  const [qualifications, setQualifications] = useState([0])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const enteredSpecialisations = String(formData.get('specialisations') || '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)

    if (enteredSpecialisations.length === 0) {
      setError('Enter at least one specialisation.')
      setSubmitting(false)
      return
    }

    const profile = {
      regNumber: formData.get('regNumber'),
      fee: Math.round(Number(formData.get('feeRupees')) * 100),
      specialisations: enteredSpecialisations,
      qualifications: qualifications.map((id) => ({
        degree: formData.get(`qualificationDegree-${id}`),
        institute: formData.get(`qualificationInstitute-${id}`),
        year: Number(formData.get(`qualificationYear-${id}`)),
      })),
    }

    try {
      await completeDoctorProfile(profile)
    } catch (requestError) {
      setError(requestError.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CareConnect home">
          <span className="brand-mark" aria-hidden="true">+</span>
          CareConnect
        </a>
        <button className="secondary-button" type="button" onClick={onLogout}>
          Sign out
        </button>
      </header>

      <main className="profile-setup-layout">
        <section className="profile-setup-intro">
          <p className="eyebrow">STEP 2 OF 2 · PROFESSIONAL PROFILE</p>
          <h1>Tell us about your practice</h1>
          <p>
            Add your credentials and consultation details. Your account will be
            reviewed before you can accept bookings.
          </p>
        </section>

        <section className="auth-card profile-setup-card" aria-labelledby="profile-setup-title">
          <h2 id="profile-setup-title">Professional details</h2>
          <p className="auth-description">
            These details help patients find the right care.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Medical registration number
              <input name="regNumber" autoComplete="off" required />
            </label>

            <label>
              Consultation fee (INR)
              <span className="currency-input">
                <span aria-hidden="true">₹</span>
                <input
                  name="feeRupees"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="e.g. 500"
                  required
                />
              </span>
            </label>
            <p className="form-hint">
              Your fee is saved in paise to match the platform payment model.
            </p>

            <fieldset className="profile-fieldset">
              <legend>Specialisations</legend>
              <label>
                Specialisation names
                <input
                  name="specialisations"
                  placeholder="e.g. Cardiology, Internal Medicine"
                  autoComplete="off"
                  required
                />
              </label>
              <p className="form-hint">
                Enter one or more names separated by commas.
              </p>
            </fieldset>

            <fieldset className="profile-fieldset">
              <legend>Qualifications</legend>
              {qualifications.map((id, index) => (
                <div className="qualification-row" key={id}>
                  <label>
                    Degree or qualification
                    <input
                      name={`qualificationDegree-${id}`}
                      placeholder="e.g. MBBS"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <label>
                    Institution
                    <input
                      name={`qualificationInstitute-${id}`}
                      placeholder="College or university"
                      autoComplete="organization"
                      required
                    />
                  </label>
                  <label>
                    Graduation year
                    <input
                      name={`qualificationYear-${id}`}
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      step="1"
                      inputMode="numeric"
                      required
                    />
                  </label>
                  {qualifications.length > 1 && (
                    <button
                      className="text-button remove-qualification"
                      type="button"
                      onClick={() =>
                        setQualifications((items) => items.filter((item) => item !== id))
                      }
                    >
                      Remove qualification
                    </button>
                  )}
                  <span className="qualification-number">Qualification {index + 1}</span>
                </div>
              ))}
              <button
                className="secondary-button add-qualification"
                type="button"
                onClick={() =>
                  setQualifications((items) => [
                    ...items,
                    Math.max(-1, ...items) + 1,
                  ])
                }
              >
                Add another qualification
              </button>
            </fieldset>

            <p className="form-hint">
              Doctor accounts require verification before accepting bookings.
            </p>
            {error && (
              <p className="form-error" role="alert">{error}</p>
            )}
            <button
              className="primary-button"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? 'Saving profile…' : 'Save profile and continue'}
            </button>
          </form>
        </section>
      </main>
      <footer className="page-footer">
        Your health information is handled with care.
      </footer>
    </div>
  )
}
