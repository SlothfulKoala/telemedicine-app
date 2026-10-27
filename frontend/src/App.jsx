import { useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import DoctorProfileSetup from './pages/DoctorProfileSetup'
import ScheduleBuilder from './pages/doctor/ScheduleBuilder'
import Appointments from './pages/doctor/Appointments'
import { AuthProvider } from './context/AuthContext'
import useAuth from './context/useAuth'
import './App.css'

const roleDetails = {
  patient: {
    title: 'Your care, all in one place',
    description: 'Find doctors, manage appointments, and keep track of your care.',
  },
  doctor: {
    title: 'Your professional profile is ready',
    description: 'Your details have been submitted for verification. We’ll let you know when you can start accepting bookings.',
  },
  admin: {
    title: 'Platform administration',
    description: 'Manage platform operations and account access.',
  },
}

function AuthenticatedApp() {
  const { user, loading, authError, logout } = useAuth()
  const [page, setPage] = useState('login')
  const [logoutError, setLogoutError] = useState('')

  if (loading) {
    return <main className="loading-state">Checking your session…</main>
  }

  async function handleLogout() {
    setLogoutError('')
    try {
      await logout()
    } catch (error) {
      setLogoutError(error.message)
    }
  }

  if (user?.role === 'doctor' && !user.onboardingComplete) {
    return <DoctorProfileSetup onLogout={handleLogout} />
  }

  if (user) {
    const details = roleDetails[user.role]

    if (user.role === 'doctor' && page === 'schedule') {
      return <ScheduleBuilder onBack={() => setPage('dashboard')} />
    }

    if (user.role === 'doctor' && page === 'appointments') {
      return <Appointments onBack={() => setPage('dashboard')} />
    }

    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand" href="/" aria-label="CareConnect home">
            <span className="brand-mark" aria-hidden="true">+</span>
            CareConnect
          </a>
          <div className="account-summary">
            <span className="role-badge">{user.role}</span>
            <span className="account-name">{user.name}</span>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="dashboard">
          <section className="welcome-panel">
            <p className="eyebrow">{user.role.toUpperCase()} DASHBOARD</p>
            <h1>Welcome, {user.name}!</h1>
            <h2>{details.title}</h2>
            <p>{details.description}</p>
            {user.role === 'doctor' && (
              <>
                <p className="status-note">
                  Your professional profile is pending medical verification.
                  Booking access will be enabled after approval.
                </p>
                <button
                  className="primary-button dashboard-action"
                  type="button"
                  onClick={() => setPage('schedule')}
                >
                  Set weekly schedule
                </button>
                <button
                  className="secondary-button dashboard-action"
                  type="button"
                  onClick={() => setPage('appointments')}
                >
                  View upcoming appointments
                </button>
              </>
            )}
          </section>
          {logoutError && <p className="form-error" role="alert">{logoutError}</p>}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CareConnect home">
          <span className="brand-mark" aria-hidden="true">+</span>
          CareConnect
        </a>
        <span className="topbar-caption">Healthcare made more connected</span>
      </header>

      <main className="auth-layout">
        <aside className="intro-panel">
          <p className="eyebrow">PERSONALIZED HEALTHCARE</p>
          <h2>Care that fits your life.</h2>
          <p>
            Connect with trusted medical professionals and make your health a
            priority, wherever you are.
          </p>
          <div className="intro-points">
            <span><span aria-hidden="true">✓</span> Secure patient accounts</span>
            <span><span aria-hidden="true">✓</span> Verified medical professionals</span>
            <span><span aria-hidden="true">✓</span> Convenient online care</span>
          </div>
        </aside>

        <div className="auth-column">
          {authError && (
            <p className="session-warning" role="alert">
              Could not restore your previous session: {authError}. You can
              still sign in below.
            </p>
          )}
          {page === 'login'
            ? <Login onRegister={() => setPage('register')} />
            : <Register onLogin={() => setPage('login')} />}
        </div>
      </main>
      <footer className="page-footer">
        Your health information is handled with care.
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
