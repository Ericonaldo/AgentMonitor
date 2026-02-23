import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type PipelineTask, type MetaAgentConfig, type AgentProvider } from '../api/client';
import { getSocket } from '../api/socket';
import { useTranslation } from '../i18n';

export function Pipeline() {
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [metaConfig, setMetaConfig] = useState<MetaAgentConfig | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // New task form
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newDir, setNewDir] = useState('');
  const [newProvider, setNewProvider] = useState<AgentProvider>('claude');
  const [newModel, setNewModel] = useState('');
  const [newOrder, setNewOrder] = useState<number | ''>('');
  const [newClaudeMd, setNewClaudeMd] = useState('');
  const [newSkipPerms, setNewSkipPerms] = useState(true);

  // Config form
  const [cfgClaudeMd, setCfgClaudeMd] = useState('');
  const [cfgDir, setCfgDir] = useState('');
  const [cfgProvider, setCfgProvider] = useState<AgentProvider>('claude');
  const [cfgPollInterval, setCfgPollInterval] = useState(5000);
  const [cfgAdminEmail, setCfgAdminEmail] = useState('');
  const [cfgWhatsappPhone, setCfgWhatsappPhone] = useState('');
  const [cfgSlackWebhook, setCfgSlackWebhook] = useState('');
  const [cfgStuckTimeout, setCfgStuckTimeout] = useState(300000);

  const fetchData = useCallback(async () => {
    try {
      const [taskData, cfgData] = await Promise.all([
        api.getTasks(),
        api.getMetaConfig(),
      ]);
      setTasks(taskData);
      setMetaConfig(cfgData);
    } catch (err) {
      console.error('Failed to fetch pipeline data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const socket = getSocket();
    socket.on('task:update', () => fetchData());
    socket.on('pipeline:complete', () => fetchData());
    socket.on('meta:status', () => fetchData());
    socket.on('agent:status', () => fetchData());

    return () => {
      socket.off('task:update');
      socket.off('pipeline:complete');
      socket.off('meta:status');
      socket.off('agent:status');
    };
  }, [fetchData]);

  const handleAddTask = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    await api.createTask({
      name: newName.trim(),
      prompt: newPrompt.trim(),
      directory: newDir.trim() || undefined,
      provider: newProvider,
      model: newModel.trim() || undefined,
      claudeMd: newClaudeMd.trim() || undefined,
      flags: { dangerouslySkipPermissions: newSkipPerms },
      order: newOrder !== '' ? newOrder : undefined,
    });
    setShowAddTask(false);
    setNewName('');
    setNewPrompt('');
    setNewDir('');
    setNewModel('');
    setNewOrder('');
    setNewClaudeMd('');
    setNewSkipPerms(true);
    fetchData();
  };

  const handleDeleteTask = async (id: string) => {
    await api.deleteTask(id);
    fetchData();
  };

  const handleResetTask = async (id: string) => {
    await api.resetTask(id);
    fetchData();
  };

  const handleClearCompleted = async () => {
    await api.clearCompletedTasks();
    fetchData();
  };

  const handleStartMeta = async () => {
    await api.startMetaAgent();
    fetchData();
  };

  const handleStopMeta = async () => {
    await api.stopMetaAgent();
    fetchData();
  };

  const handleSaveConfig = async () => {
    await api.updateMetaConfig({
      claudeMd: cfgClaudeMd,
      defaultDirectory: cfgDir,
      defaultProvider: cfgProvider,
      pollIntervalMs: cfgPollInterval,
      adminEmail: cfgAdminEmail.trim() || undefined,
      whatsappPhone: cfgWhatsappPhone.trim() || undefined,
      slackWebhookUrl: cfgSlackWebhook.trim() || undefined,
      stuckTimeoutMs: cfgStuckTimeout,
    });
    setShowConfig(false);
    fetchData();
  };

  const openConfig = () => {
    if (metaConfig) {
      setCfgClaudeMd(metaConfig.claudeMd);
      setCfgDir(metaConfig.defaultDirectory);
      setCfgProvider(metaConfig.defaultProvider);
      setCfgPollInterval(metaConfig.pollIntervalMs);
      setCfgAdminEmail(metaConfig.adminEmail || '');
      setCfgWhatsappPhone(metaConfig.whatsappPhone || '');
      setCfgSlackWebhook(metaConfig.slackWebhookUrl || '');
      setCfgStuckTimeout(metaConfig.stuckTimeoutMs || 300000);
    }
    setShowConfig(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'var(--text-muted)';
      case 'running': return 'var(--green)';
      case 'completed': return 'var(--primary)';
      case 'failed': return 'var(--red)';
      default: return 'var(--text-muted)';
    }
  };

  // Group tasks by order
  const orderGroups = tasks.reduce<Map<number, PipelineTask[]>>((acc, task) => {
    const group = acc.get(task.order) || [];
    group.push(task);
    acc.set(task.order, group);
    return acc;
  }, new Map());

  const sortedOrders = [...orderGroups.keys()].sort((a, b) => a - b);

  if (loading) return <div>{t('common.loading')}</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{t('pipeline.title')}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 13,
              padding: '4px 10px',
              borderRadius: 12,
              background: metaConfig?.running ? 'var(--green)' : 'var(--bg-input)',
              color: metaConfig?.running ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            {t('pipeline.manager')} {metaConfig?.running ? t('pipeline.running') : t('pipeline.stopped')}
          </span>
          {metaConfig?.running ? (
            <button className="btn btn-danger btn-sm" onClick={handleStopMeta}>
              {t('pipeline.stopManager')}
            </button>
          ) : (
            <button className="btn btn-sm" onClick={handleStartMeta}>
              {t('pipeline.startManager')}
            </button>
          )}
          <button className="btn btn-sm btn-outline" onClick={openConfig}>
            {t('pipeline.configure')}
          </button>
          <button className="btn btn-sm" onClick={() => setShowAddTask(true)}>
            {t('pipeline.addTask')}
          </button>
          {tasks.some(tsk => tsk.status === 'completed' || tsk.status === 'failed') && (
            <button className="btn btn-sm btn-outline" onClick={handleClearCompleted}>
              {t('pipeline.clearDone')}
            </button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          {t('pipeline.empty')}
        </div>
      ) : (
        <div className="pipeline-timeline">
          {sortedOrders.map((order, idx) => {
            const group = orderGroups.get(order)!;
            const isParallel = group.length > 1;

            return (
              <div key={order}>
                {idx > 0 && (
                  <div className="pipeline-arrow">
                    <svg width="24" height="32" viewBox="0 0 24 32">
                      <path d="M12 0 L12 24 M6 18 L12 24 L18 18" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                )}
                <div className="pipeline-group">
                  <div className="pipeline-group-label">
                    {t('pipeline.step')} {order} {isParallel && <span style={{ color: 'var(--primary)' }}>{t('pipeline.parallel')}</span>}
                  </div>
                  <div className={`pipeline-tasks ${isParallel ? 'parallel' : ''}`}>
                    {group.map((task) => (
                      <div key={task.id} className="pipeline-task-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{task.name}</span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '1px 8px',
                              borderRadius: 10,
                              background: getStatusColor(task.status),
                              color: 'white',
                            }}
                          >
                            {task.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                          {task.prompt.length > 80 ? task.prompt.slice(0, 80) + '...' : task.prompt}
                        </div>
                        {task.directory && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {t('pipeline.dir')} {task.directory}
                          </div>
                        )}
                        {task.provider && (
                          <span className={`provider-badge provider-${task.provider}`} style={{ marginTop: 4, display: 'inline-block' }}>
                            {task.provider.toUpperCase()}
                          </span>
                        )}
                        {task.error && (
                          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                            {t('pipeline.error')} {task.error}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {task.status === 'pending' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTask(task.id)}>
                              {t('common.delete')}
                            </button>
                          )}
                          {(task.status === 'failed' || task.status === 'completed') && (
                            <button className="btn btn-sm btn-outline" onClick={() => handleResetTask(task.id)}>
                              {t('common.reset')}
                            </button>
                          )}
                          {task.agentId && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => navigate(`/agent/${task.agentId}`)}
                            >
                              {t('pipeline.viewAgent')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('pipeline.addTaskTitle')}</span>
              <button className="btn btn-sm btn-outline" onClick={() => setShowAddTask(false)}>
                {t('common.cancel')}
              </button>
            </div>
            <div className="form-group">
              <label>{t('pipeline.taskName')}</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t('pipeline.taskNamePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('create.prompt')}</label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder={t('pipeline.promptPlaceholder')}
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="form-group">
              <label>{t('pipeline.workingDirOptional')}</label>
              <input value={newDir} onChange={(e) => setNewDir(e.target.value)} placeholder={t('pipeline.workingDirPlaceholder')} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('common.provider')}</label>
                <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as AgentProvider)}>
                  <option value="claude">{t('common.claudeCode')}</option>
                  <option value="codex">{t('common.codex')}</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('pipeline.modelOptional')}</label>
                <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="e.g., claude-sonnet-4-5-20250514" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('pipeline.stepOrder')}</label>
                <input
                  type="number"
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder={t('pipeline.stepOrderPlaceholder')}
                  min={0}
                />
              </div>
            </div>
            <div className="form-group">
              <label>{t('pipeline.claudeMdOptional')}</label>
              <textarea
                value={newClaudeMd}
                onChange={(e) => setNewClaudeMd(e.target.value)}
                placeholder={t('pipeline.claudeMdPlaceholder')}
                style={{ minHeight: 60 }}
              />
            </div>
            <div className="checkbox-group" style={{ marginBottom: 16 }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={newSkipPerms}
                  onChange={(e) => setNewSkipPerms(e.target.checked)}
                />
                {t('pipeline.skipPermissions')}
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleAddTask} disabled={!newName.trim() || !newPrompt.trim()}>
                {t('pipeline.addTaskBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('pipeline.configTitle')}</span>
              <button className="btn btn-sm btn-outline" onClick={() => setShowConfig(false)}>
                {t('common.cancel')}
              </button>
            </div>
            <div className="form-group">
              <label>{t('pipeline.defaultDir')}</label>
              <input value={cfgDir} onChange={(e) => setCfgDir(e.target.value)} placeholder={t('pipeline.defaultDirPlaceholder')} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('pipeline.defaultProvider')}</label>
                <select value={cfgProvider} onChange={(e) => setCfgProvider(e.target.value as AgentProvider)}>
                  <option value="claude">{t('common.claudeCode')}</option>
                  <option value="codex">{t('common.codex')}</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('pipeline.pollInterval')}</label>
                <input
                  type="number"
                  value={cfgPollInterval}
                  onChange={(e) => setCfgPollInterval(parseInt(e.target.value) || 5000)}
                  min={1000}
                  step={1000}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('pipeline.adminEmail')}</label>
                <input
                  value={cfgAdminEmail}
                  onChange={(e) => setCfgAdminEmail(e.target.value)}
                  placeholder={t('pipeline.adminEmailPlaceholder')}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('pipeline.whatsappPhone')}</label>
                <input
                  value={cfgWhatsappPhone}
                  onChange={(e) => setCfgWhatsappPhone(e.target.value)}
                  placeholder={t('pipeline.whatsappPhonePlaceholder')}
                />
              </div>
            </div>
            <div className="form-group">
              <label>{t('pipeline.slackWebhook')}</label>
              <input
                value={cfgSlackWebhook}
                onChange={(e) => setCfgSlackWebhook(e.target.value)}
                placeholder={t('pipeline.slackWebhookPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('pipeline.stuckTimeout')}</label>
              <input
                type="number"
                value={cfgStuckTimeout / 60000}
                onChange={(e) => setCfgStuckTimeout((parseInt(e.target.value) || 5) * 60000)}
                min={1}
                step={1}
              />
            </div>
            <div className="form-group">
              <label>{t('pipeline.defaultClaudeMd')}</label>
              <textarea
                value={cfgClaudeMd}
                onChange={(e) => setCfgClaudeMd(e.target.value)}
                style={{ minHeight: 200 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleSaveConfig}>
                {t('pipeline.saveConfig')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
