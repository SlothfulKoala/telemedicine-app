import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          color: 'var(--cream-soft)',
        }}
      >
        Verifying session...
      </main>
    );
  }

  if (!user) {
    const redirectTarget = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?mode=login&redirect=${encodeURIComponent(redirectTarget)}`}
        replace
      />
    );
  }

  if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    const fallbackPath =
      user.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}