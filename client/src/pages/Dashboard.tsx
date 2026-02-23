import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Agent } from '../api/client';
import { getSocket } from '../api/socket';
import { useTranslation } from '../i18n';

export function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [retentionHours, setRetentionHours] = useState(24);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchAgents = async () => {
    try {
      const data = await api.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const s = await api.getSettings();
      setRetentionHours(s.agentRetentionMs / 3_600_000);
    } catch {
      // ignore
    }
  };

  const handleSaveSettings = async () => {
    await api.updateSettings({ agentRetentionMs: retentionHours * 3_600_000 });
    setShowSettings(false);
  };

  useEffect(() => {
    fetchAgents();
    fetchSettings();

    const socket = getSocket();
    socket.on('agent:status', () => {
      fetchAgents();
    });
    socket.on('agent:message', () => {
      fetchAgents();
    });

    return () => {
      socket.off('agent:status');
      socket.off('agent:message');
    };
  }, []);

  const handleStopAll = async () => {
    await api.stopAllAgents();
    fetchAgents();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.deleteAgent(id);
    fetchAgents();
  };

  const handleStop = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.stopAgent(id);
    fetchAgents();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  };

  const getLastMessage = (agent: Agent) => {
    if (agent.messages.length === 0) return t('dashboard.noMessages');
    const last = agent.messages[agent.messages.length - 1];
    const text = last.content;
    return text.length > 100 ? text.slice(0, 100) + '...' : text;
  };

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => navigate('/create')}>
            {t('dashboard.newAgent')}
          </button>
          {agents.length > 0 && (
            <button className="btn btn-danger" onClick={handleStopAll}>
              {t('dashboard.stopAll')}
            </button>
          )}
          <button className="btn btn-outline" onClick={() => setShowSettings(true)} title={t('dashboard.settings')}>
            &#9881;
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          {t('dashboard.empty')}
        </div>
      ) : (
        <div className="card-grid">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="card"
              onClick={() => navigate(`/agent/${agent.id}`)}
            >
              <div className="card-header">
                <span className="card-name">
                  <span className={`provider-badge provider-${agent.config.provider || 'claude'}`}>
                    {(agent.config.provider || 'claude').toUpperCase()}
                  </span>
                  {' '}{agent.name}
                </span>
                <span className={`status status-${agent.status}`}>
                  <span className="status-dot" />
                  {agent.status}
                </span>
              </div>
              <div className="card-body">{getLastMessage(agent)}</div>
              <div className="card-footer">
                <span>{agent.config.directory}</span>
                <span>{formatTime(agent.lastActivity)}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {(agent.status === 'running' || agent.status === 'waiting_input') && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={(e) => handleStop(e, agent.id)}
                  >
                    {t('common.stop')}
                  </button>
                )}
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => handleDelete(e, agent.id)}
                >
                  {t('common.delete')}
                </button>
                {agent.costUsd !== undefined && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                    ${agent.costUsd.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('dashboard.settings')}</h2>
            <div className="form-group">
              <label>{t('dashboard.retentionHours')}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={retentionHours}
                onChange={(e) => setRetentionHours(Math.max(0, Number(e.target.value)))}
                placeholder={t('dashboard.retentionDisabled')}
              />
              {retentionHours === 0 && (
                <small style={{ color: 'var(--text-muted)' }}>{t('dashboard.retentionDisabled')}</small>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setShowSettings(false)}>
                {t('common.cancel')}
              </button>
              <button className="btn" onClick={handleSaveSettings}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
