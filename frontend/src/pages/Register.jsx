import { useState } from 'react'
import useAuth from '../context/useAuth'

export default function Register({ onLogin }) {
  const { register } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState('patient')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const details = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      role,
    }

    if (role === 'doctor') {
      details.regNumber = formData.get('regNumber')
      details.fee = Number(formData.get('fee'))
    }

    try {
      await register(details)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="register-title">
      <p className="eyebrow">JOIN CARECONNECT</p>
      <h1 id="register-title">Create your account</h1>
      <p className="auth-description">
        Register as a patient or a medical professional.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          I am registering as
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>
        </label>
        <label>
          Full name
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Phone number
          <input name="phone" type="tel" autoComplete="tel" required />
        </label>

        {role === 'doctor' && (
          <>
            <label>
              Medical registration number
              <input name="regNumber" required />
            </label>
            <label>
              Consultation fee (in paise)
              <input name="fee" type="number" min="0" step="1" required />
            </label>
            <p className="form-hint">
              Doctor accounts require verification before accepting bookings.
            </p>
          </>
        )}

        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength="8"
            required
          />
        </label>
        <p className="form-hint">
          Use at least 8 characters. Administrator accounts are provisioned
          separately.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="text-button" onClick={onLogin}>
          Sign in
        </button>
      </p>
    </section>
  )
}