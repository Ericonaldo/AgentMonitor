import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { CreateAgent } from './pages/CreateAgent';
import { AgentChat } from './pages/AgentChat';
import { Templates } from './pages/Templates';

export function App() {
  const location = useLocation();

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">Agent Monitor</div>
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/create" className={location.pathname === '/create' ? 'active' : ''}>
            New Agent
          </Link>
          <Link to="/templates" className={location.pathname === '/templates' ? 'active' : ''}>
            Templates
          </Link>
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateAgent />} />
          <Route path="/agent/:id" element={<AgentChat />} />
          <Route path="/templates" element={<Templates />} />
        </Routes>
      </main>
    </div>
  );
}
