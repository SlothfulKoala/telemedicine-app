import { useState } from 'react'
import useAuth from '../context/useAuth'

export default function Login({ onRegister }) {
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const formData = new FormData(event.currentTarget)
    try {
      await login({
        email: formData.get('email'),
        password: formData.get('password'),
      })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-card" aria-labelledby="login-title">
      <p className="eyebrow">WELCOME BACK</p>
      <h1 id="login-title">Sign in to your account</h1>
      <p className="auth-description">
        Access your telemedicine account securely.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
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
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        New to CareConnect?{' '}
        <button type="button" className="text-button" onClick={onRegister}>
          Create an account
        </button>
      </p>
    </section>
  )
}