import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

// const resolveApiBaseUrl = () => {
//   const savedBackend = localStorage.getItem('TELEMED_BACKEND_URL');
//   if (savedBackend) return `${savedBackend.replace(/\/+$/, '')}/api`;

//   const envBackend = import.meta.env.VITE_BACKEND_URL;
//   if (envBackend) return `${envBackend.replace(/\/+$/, '')}/api`;

//   return '/api';
// };

// export const api = axios.create({
//   baseURL: resolveApiBaseUrl(),
//   withCredentials: true,
// });

const resolveApiBaseUrl = () => {
  const savedBackend = localStorage.getItem('TELEMED_BACKEND_URL');
  if (savedBackend) return `${savedBackend.replace(/\/+$/, '')}/api`;

  const envBackend = import.meta.env.VITE_BACKEND_URL;
  if (envBackend) return `${envBackend.replace(/\/+$/, '')}/api`;

  return '/api';
};

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

const AuthContext = createContext(null);
const SESSION_FLAG_KEY = 'vitalise_has_session';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Prevents React 18/19 <StrictMode> from firing the session check twice in dev
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const checkUserSession = async () => {
      // Only ping /api/auth/me if this browser has an active session flag.
      // This completely eliminates 401 console noise for Guest visitors!
      const hasSessionHint = localStorage.getItem(SESSION_FLAG_KEY) === 'true';
      if (!hasSessionHint) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data && res.data.user) {
          setUser(res.data.user);
        } else {
          localStorage.removeItem(SESSION_FLAG_KEY);
          setUser(null);
        }
      } catch (err) {
        // Cookie expired or invalid — clear the hint so future refreshes stay silent
        localStorage.removeItem(SESSION_FLAG_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserSession();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.user) {
      localStorage.setItem(SESSION_FLAG_KEY, 'true');
      setUser(res.data.user);
    }
    return res.data;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    if (res.data?.user) {
      localStorage.setItem(SESSION_FLAG_KEY, 'true');
      setUser(res.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore if backend logout route is not mounted
    } finally {
      localStorage.removeItem(SESSION_FLAG_KEY);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};