import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type PipelineTask, type MetaAgentConfig, type AgentProvider } from '../api/client';
import { getSocket } from '../api/socket';

export function Pipeline() {
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [metaConfig, setMetaConfig] = useState<MetaAgentConfig | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Task Pipeline</h1>
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
            Manager: {metaConfig?.running ? 'Running' : 'Stopped'}
          </span>
          {metaConfig?.running ? (
            <button className="btn btn-danger btn-sm" onClick={handleStopMeta}>
              Stop Manager
            </button>
          ) : (
            <button className="btn btn-sm" onClick={handleStartMeta}>
              Start Manager
            </button>
          )}
          <button className="btn btn-sm btn-outline" onClick={openConfig}>
            Configure
          </button>
          <button className="btn btn-sm" onClick={() => setShowAddTask(true)}>
            + Add Task
          </button>
          {tasks.some(t => t.status === 'completed' || t.status === 'failed') && (
            <button className="btn btn-sm btn-outline" onClick={handleClearCompleted}>
              Clear Done
            </button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          No tasks in pipeline. Add tasks and start the manager to begin.
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
                    Step {order} {isParallel && <span style={{ color: 'var(--primary)' }}>(parallel)</span>}
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
                            Dir: {task.directory}
                          </div>
                        )}
                        {task.provider && (
                          <span className={`provider-badge provider-${task.provider}`} style={{ marginTop: 4, display: 'inline-block' }}>
                            {task.provider.toUpperCase()}
                          </span>
                        )}
                        {task.error && (
                          <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
                            Error: {task.error}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          {task.status === 'pending' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteTask(task.id)}>
                              Delete
                            </button>
                          )}
                          {(task.status === 'failed' || task.status === 'completed') && (
                            <button className="btn btn-sm btn-outline" onClick={() => handleResetTask(task.id)}>
                              Reset
                            </button>
                          )}
                          {task.agentId && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => navigate(`/agent/${task.agentId}`)}
                            >
                              View Agent
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
              <span className="modal-title">Add Pipeline Task</span>
              <button className="btn btn-sm btn-outline" onClick={() => setShowAddTask(false)}>
                Cancel
              </button>
            </div>
            <div className="form-group">
              <label>Task Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Create login page" />
            </div>
            <div className="form-group">
              <label>Prompt</label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="What should the agent do?"
                style={{ minHeight: 80 }}
              />
            </div>
            <div className="form-group">
              <label>Working Directory (optional, uses default if empty)</label>
              <input value={newDir} onChange={(e) => setNewDir(e.target.value)} placeholder="/path/to/project" />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Provider</label>
                <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as AgentProvider)}>
                  <option value="claude">Claude Code</option>
                  <option value="codex">Codex</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Model (optional)</label>
                <input value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="e.g., claude-sonnet-4-5-20250514" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Step Order</label>
                <input
                  type="number"
                  value={newOrder}
                  onChange={(e) => setNewOrder(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="Auto (next)"
                  min={0}
                />
              </div>
            </div>
            <div className="form-group">
              <label>CLAUDE.md (optional, uses manager default if empty)</label>
              <textarea
                value={newClaudeMd}
                onChange={(e) => setNewClaudeMd(e.target.value)}
                placeholder="Custom instructions for this task..."
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
                Skip permissions
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleAddTask} disabled={!newName.trim() || !newPrompt.trim()}>
                Add Task
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
              <span className="modal-title">Manager Configuration</span>
              <button className="btn btn-sm btn-outline" onClick={() => setShowConfig(false)}>
                Cancel
              </button>
            </div>
            <div className="form-group">
              <label>Default Working Directory</label>
              <input value={cfgDir} onChange={(e) => setCfgDir(e.target.value)} placeholder="/path/to/default/project" />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Default Provider</label>
                <select value={cfgProvider} onChange={(e) => setCfgProvider(e.target.value as AgentProvider)}>
                  <option value="claude">Claude Code</option>
                  <option value="codex">Codex</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Poll Interval (ms)</label>
                <input
                  type="number"
                  value={cfgPollInterval}
                  onChange={(e) => setCfgPollInterval(parseInt(e.target.value) || 5000)}
                  min={1000}
                  step={1000}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Default CLAUDE.md for managed agents</label>
              <textarea
                value={cfgClaudeMd}
                onChange={(e) => setCfgClaudeMd(e.target.value)}
                style={{ minHeight: 200 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleSaveConfig}>
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
