import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { CreateAgent } from './pages/CreateAgent';
import { AgentChat } from './pages/AgentChat';
import { Templates } from './pages/Templates';
import { Pipeline } from './pages/Pipeline';
import { LanguageProvider, useTranslation } from './i18n';

function NavBar() {
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
    </nav>
  );
}

export function App() {
  useEffect(() => {
    const saved = localStorage.getItem('agentmonitor-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  return (
    <LanguageProvider>
      <div className="app">
        <NavBar />
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
    </LanguageProvider>
  );
}
