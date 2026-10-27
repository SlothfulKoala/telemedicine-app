import { useEffect, useState } from 'react'
import AuthContext from './contextStore'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function authRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/auth${path}`, {
    ...options,
    credentials: 'include',
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

  async function logout() {
    await authRequest('/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
