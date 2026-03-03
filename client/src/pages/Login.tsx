import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        navigate('/');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--bg, #0f172a)',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--card-bg, #1e293b)',
        padding: '2rem',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '360px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ margin: '0 0 1.5rem', textAlign: 'center', color: 'var(--text, #e2e8f0)' }}>
          Agent Monitor
        </h2>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border, #334155)',
            background: 'var(--input-bg, #0f172a)',
            color: 'var(--text, #e2e8f0)',
            fontSize: '1rem',
            boxSizing: 'border-box',
            marginBottom: '1rem',
          }}
        />
        {error && (
          <div style={{ color: '#ef4444', marginBottom: '0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--primary, #3b82f6)',
            color: '#fff',
            fontSize: '1rem',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
