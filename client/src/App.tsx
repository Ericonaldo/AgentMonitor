import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { CreateAgent } from './pages/CreateAgent';
import { AgentChat } from './pages/AgentChat';
import { Templates } from './pages/Templates';
import { Pipeline } from './pages/Pipeline';
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';
import { LanguageProvider, useTranslation } from './i18n';

function NavBar({ onLogout }: { onLogout?: () => void }) {
  const location = useLocation();
  const { lang, setLang, t } = useTranslation();

  return (
    <nav className="nav">
      <div className="nav-brand">{t('nav.brand')}</div>
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          {t('nav.dashboard')}
        </Link>
        <Link to="/pipeline" className={location.pathname === '/pipeline' ? 'active' : ''}>
          {t('nav.pipeline')}
        </Link>
        <Link to="/create" className={location.pathname === '/create' ? 'active' : ''}>
          {t('nav.newAgent')}
        </Link>
        <Link to="/templates" className={location.pathname === '/templates' ? 'active' : ''}>
          {t('nav.templates')}
        </Link>
      </div>
      <a
        href="/docs/"
        target="_blank"
        rel="noopener noreferrer"
        className="help-btn"
        title={t('nav.help')}
      >
        ?
      </a>
      <button
        className="lang-toggle"
        onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      >
        {lang === 'en' ? '中文' : 'EN'}
      </button>
      {onLogout && (
        <button
          className="lang-toggle"
          onClick={onLogout}
          title="Logout"
          style={{ marginLeft: '0.25rem' }}
        >
          Logout
        </button>
      )}
    </nav>
  );
}

function AuthenticatedApp() {
  const { authenticated, loading, logout } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text, #e2e8f0)' }}>Loading...</div>;
  }

  if (!authenticated) {
    return null; // useAuth will redirect to /login
  }

  return (
    <div className="app">
      <NavBar onLogout={logout} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/create" element={<CreateAgent />} />
          <Route path="/agent/:id" element={<AgentChat />} />
          <Route path="/templates" element={<Templates />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  useEffect(() => {
    const saved = localStorage.getItem('agentmonitor-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  return (
    <LanguageProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </LanguageProvider>
  );
}
