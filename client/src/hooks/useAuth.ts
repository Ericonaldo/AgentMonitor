import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthState {
  authenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/auth/check')
      .then(res => {
        if (res.ok) {
          setAuthenticated(true);
        } else {
          setAuthenticated(false);
          navigate('/login');
        }
      })
      .catch(() => {
        // If check endpoint doesn't exist (local mode), assume authenticated
        setAuthenticated(true);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setAuthenticated(false);
    navigate('/login');
  }, [navigate]);

  return { authenticated, loading, logout };
}
