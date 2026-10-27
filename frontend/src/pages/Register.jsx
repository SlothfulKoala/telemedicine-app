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
    try {
      await register({
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        role,
      })
    } catch (requestError) {
      setError(requestError.message)
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="register-title">
      <p className="eyebrow">JOIN CARECONNECT</p>
      <h1 id="register-title">Create your account</h1>
      <p className="auth-description">
        Register to continue to {role === 'doctor' ? 'professional profile setup' : 'your care'}.
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
