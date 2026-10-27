import { useCallback, useEffect, useState } from 'react'
import AuthContext from './contextStore'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function apiRequest(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.message || 'The request could not be completed.')
      error.status = response.status
      throw error
    }

    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'The request timed out. Check the backend connection and try again.',
        { cause: error },
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function authRequest(path, options) {
  return apiRequest(`${API_BASE_URL}/auth${path}`, options)
}

function scheduleRequest(path, options) {
  return apiRequest(`${API_BASE_URL}/schedule${path}`, options)
}

function bookingRequest(path, options) {
  return apiRequest(`${API_BASE_URL}/booking${path}`, options)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true

    authRequest('/me')
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser)
      })
      .catch((error) => {
        if (active && error.status !== 401) setAuthError(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function login(credentials) {
    const data = await authRequest('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    setUser(data.user)
    setAuthError('')
    return data
  }

  async function register(details) {
    const data = await authRequest('/register', {
      method: 'POST',
      body: JSON.stringify(details),
    })
    setUser(data.user)
    setAuthError('')
    return data
  }

  async function completeDoctorProfile(profile) {
    const data = await authRequest('/doctor-profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    })
    setUser(data.user)
    return data
  }

  const getWeeklySchedule = useCallback(
    () => scheduleRequest('/weekly'),
    [],
  )

  const getDoctorAppointments = useCallback(
    () => bookingRequest('/doctor/appointments'),
    [],
  )

  async function saveWeeklySchedule(weeklySchedule) {
    return scheduleRequest('/weekly', {
      method: 'PUT',
      body: JSON.stringify({ weeklySchedule }),
    })
  }

  async function logout() {
    await authRequest('/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        login,
        register,
        completeDoctorProfile,
        getWeeklySchedule,
        saveWeeklySchedule,
        getDoctorAppointments,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
