import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Agent } from '../api/client';
import { getSocket, joinAgent, leaveAgent } from '../api/socket';
import { useTranslation } from '../i18n';

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('agentmonitor-theme', next);
}

export function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [input, setInput] = useState('');
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedHint, setSelectedHint] = useState(0);
  const [editingClaudeMd, setEditingClaudeMd] = useState(false);
  const [claudeMdContent, setClaudeMdContent] = useState('');
  const [localMessages, setLocalMessages] = useState<Array<{ id: string; role: string; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastEscRef = useRef(0);

  const addLocalMessage = (content: string, role = 'system') => {
    setLocalMessages((prev) => [...prev, { id: `local-${Date.now()}`, role, content }]);
  };

  const slashCommands = [
    { cmd: '/agents', desc: t('chat.slashAgents') },
    { cmd: '/clear', desc: t('chat.slashClear') },
    { cmd: '/compact', desc: t('chat.slashCompact') },
    { cmd: '/config', desc: t('chat.slashConfig') },
    { cmd: '/context', desc: t('chat.slashContext') },
    { cmd: '/copy', desc: t('chat.slashCopy') },
    { cmd: '/cost', desc: t('chat.slashCost') },
    { cmd: '/doctor', desc: t('chat.slashDoctor') },
    { cmd: '/exit', desc: t('chat.slashExit') },
    { cmd: '/export', desc: t('chat.slashExport') },
    { cmd: '/help', desc: t('chat.slashHelp') },
    { cmd: '/memory', desc: t('chat.slashMemory') },
    { cmd: '/model', desc: t('chat.slashModel') },
    { cmd: '/permissions', desc: t('chat.slashPermissions') },
    { cmd: '/plan', desc: t('chat.slashPlan') },
    { cmd: '/plugin', desc: t('chat.slashPlugin') },
    { cmd: '/rename', desc: t('chat.slashRename') },
    { cmd: '/skills', desc: t('chat.slashSkills') },
    { cmd: '/stats', desc: t('chat.slashStats') },
    { cmd: '/status', desc: t('chat.slashStatus') },
    { cmd: '/stop', desc: t('chat.slashStop') },
    { cmd: '/tasks', desc: t('chat.slashTasks') },
    { cmd: '/theme', desc: t('chat.slashTheme') },
    { cmd: '/todos', desc: t('chat.slashTodos') },
    { cmd: '/usage', desc: t('chat.slashUsage') },
  ];

  const fetchAgent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getAgent(id);
      setAgent(data);
    } catch {
      navigate('/');
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchAgent();
    if (!id) return;

    joinAgent(id);
    const socket = getSocket();

    const onMessage = (data: { agentId: string }) => {
      if (data.agentId === id) fetchAgent();
    };
    const onStatus = (data: { agentId: string }) => {
      if (data.agentId === id) fetchAgent();
    };

    socket.on('agent:message', onMessage);
    socket.on('agent:status', onStatus);

    return () => {
      leaveAgent(id);
      socket.off('agent:message', onMessage);
      socket.off('agent:status', onStatus);
    };
  }, [id, fetchAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agent?.messages]);

  // Double-Esc handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscRef.current < 500) {
          // Double Esc
          if (id) {
            api.interruptAgent(id);
          }
          lastEscRef.current = 0;
        } else {
          lastEscRef.current = now;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [id]);

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.startsWith('/')) {
      setShowSlash(true);
      setSlashFilter(value);
      setSelectedHint(0);
    } else {
      setShowSlash(false);
    }
  };

  const handleSlashSelect = (cmd: string) => {
    setShowSlash(false);
    setInput('');

    switch (cmd) {
      case '/agents':
        api.getAgents().then((agents) => {
          if (agents.length === 0) {
            addLocalMessage(t('chat.noAgents'));
          } else {
            const lines = agents.map((a) => {
              const cost = a.costUsd !== undefined ? `$${a.costUsd.toFixed(4)}` : '';
              return `${a.name} | ${(a.config.provider || 'claude').toUpperCase()} | ${a.status} ${cost}`;
            });
            addLocalMessage(lines.join('\n'));
          }
        });
        break;
      case '/help':
        addLocalMessage(
          slashCommands.map((c) => `${c.cmd}  ${c.desc}`).join('\n'),
        );
        break;
      case '/clear':
        setLocalMessages([]);
        break;
      case '/compact':
        // Support /compact [instructions] - send as message if has args
        addLocalMessage(t('chat.compactMsg'));
        break;
      case '/config':
        if (agent) {
          const info = [
            `Provider: ${agent.config.provider}`,
            `Directory: ${agent.config.directory}`,
            `Flags: ${JSON.stringify(agent.config.flags)}`,
            agent.config.adminEmail ? `Admin Email: ${agent.config.adminEmail}` : null,
          ].filter(Boolean).join('\n');
          addLocalMessage(info);
        }
        break;
      case '/cost':
        if (agent) {
          const costInfo = agent.costUsd !== undefined
            ? `$${agent.costUsd.toFixed(4)}`
            : agent.tokenUsage
              ? `Input: ${agent.tokenUsage.input} | Output: ${agent.tokenUsage.output} | Total: ${agent.tokenUsage.input + agent.tokenUsage.output} tokens`
              : t('chat.noCostData');
          addLocalMessage(costInfo);
        }
        fetchAgent();
        break;
      case '/export': {
        if (agent) {
          const exported = agent.messages
            .map((m) => `[${m.role}] ${m.content}`)
            .join('\n\n---\n\n');
          const blob = new Blob([exported], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${agent.name}-conversation.txt`;
          a.click();
          URL.revokeObjectURL(url);
          addLocalMessage(t('chat.exportedMsg'));
        }
        break;
      }
      case '/memory':
        if (agent) {
          setClaudeMdContent(agent.config.claudeMd || '');
          setEditingClaudeMd(true);
        }
        break;
      case '/model':
        if (agent) {
          const modelInfo = agent.config.flags?.model
            ? `${t('chat.currentModel')}: ${agent.config.flags.model}`
            : `${t('chat.currentModel')}: ${t('chat.defaultModel')}`;
          addLocalMessage(modelInfo);
        }
        break;
      case '/skills': {
        const skills = slashCommands.map(c => `${c.cmd} - ${c.desc}`);
        addLocalMessage(t('chat.availableSkills') + '\n\n' + skills.join('\n'));
        break;
      }
      case '/stats':
        if (agent) {
          const msgs = agent.messages;
          const userMsgs = msgs.filter((m) => m.role === 'user').length;
          const assistantMsgs = msgs.filter((m) => m.role === 'assistant').length;
          const toolMsgs = msgs.filter((m) => m.role === 'tool').length;
          const totalChars = msgs.reduce((sum, m) => sum + m.content.length, 0);
          const duration = agent.lastActivity - agent.createdAt;
          const durationStr = duration > 60000
            ? `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
            : `${Math.floor(duration / 1000)}s`;
          const statsLines = [
            `${t('chat.statsMessages')}: ${msgs.length} (${t('chat.statsUser')}: ${userMsgs}, ${t('chat.statsAssistant')}: ${assistantMsgs}, ${t('chat.statsTool')}: ${toolMsgs})`,
            `${t('chat.statsChars')}: ${totalChars.toLocaleString()}`,
            `${t('chat.statsDuration')}: ${durationStr}`,
            agent.costUsd !== undefined ? `${t('chat.statsCost')}: $${agent.costUsd.toFixed(4)}` : null,
            agent.tokenUsage ? `Tokens: ${(agent.tokenUsage.input + agent.tokenUsage.output).toLocaleString()}` : null,
          ].filter(Boolean).join('\n');
          addLocalMessage(statsLines);
        }
        fetchAgent();
        break;
      case '/status':
        if (agent) {
          const statusInfo = [
            `${t('chat.agentName')}: ${agent.name}`,
            `${t('chat.agentStatus')}: ${agent.status}`,
            `Provider: ${(agent.config.provider || 'claude').toUpperCase()}`,
            `Directory: ${agent.config.directory}`,
            agent.costUsd !== undefined ? `Cost: $${agent.costUsd.toFixed(4)}` : null,
            agent.tokenUsage ? `Tokens: ${agent.tokenUsage.input + agent.tokenUsage.output}` : null,
          ].filter(Boolean).join('\n');
          addLocalMessage(statusInfo);
        }
        fetchAgent();
        break;
      case '/stop':
        if (id) api.stopAgent(id);
        break;
      case '/context':
        if (agent) {
          const totalTokens = agent.tokenUsage
            ? agent.tokenUsage.input + agent.tokenUsage.output
            : 0;
          const maxContext = 200000;
          const pct = totalTokens > 0 ? Math.round((totalTokens / maxContext) * 100) : 0;
          const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
          const contextLines = [
            `${t('chat.contextUsage')}:`,
            `[${bar}] ${pct}%`,
            `${totalTokens.toLocaleString()} / ${maxContext.toLocaleString()} tokens`,
            agent.tokenUsage ? `Input: ${agent.tokenUsage.input.toLocaleString()} | Output: ${agent.tokenUsage.output.toLocaleString()}` : '',
          ].filter(Boolean).join('\n');
          addLocalMessage(contextLines);
        }
        fetchAgent();
        break;
      case '/copy': {
        if (agent) {
          const lastAssistant = [...agent.messages].reverse().find(m => m.role === 'assistant');
          if (lastAssistant) {
            navigator.clipboard.writeText(lastAssistant.content).then(() => {
              addLocalMessage(t('chat.copiedMsg'));
            }).catch(() => {
              addLocalMessage(t('chat.copiedMsg'));
            });
          } else {
            addLocalMessage(t('chat.noCopyContent'));
          }
        }
        break;
      }
      case '/doctor':
        if (agent) {
          const issues: string[] = [];
          if (agent.status === 'error') issues.push('Agent is in error state');
          if (!agent.config.directory) issues.push('No working directory configured');
          if (agent.messages.length === 0) issues.push('No messages in conversation');
          if (issues.length === 0) {
            addLocalMessage(`${t('chat.doctorOk')}\nStatus: ${agent.status}\nProvider: ${(agent.config.provider || 'claude').toUpperCase()}\nMessages: ${agent.messages.length}`);
          } else {
            addLocalMessage(`${t('chat.doctorError')}\n${issues.join('\n')}`);
          }
        }
        fetchAgent();
        break;
      case '/exit':
        navigate('/');
        break;
      case '/permissions':
        if (agent) {
          const flags = agent.config.flags || {};
          const flagLines = Object.entries(flags)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n');
          addLocalMessage(`${t('chat.permissionsTitle')}:\n${flagLines || '  (none)'}`);
        }
        break;
      case '/plan':
        if (id) {
          api.sendMessage(id, '/plan');
          addLocalMessage(t('chat.planSent'));
        }
        break;
      case '/plugin':
        addLocalMessage(t('chat.pluginInfo'));
        break;
      case '/rename': {
        const newName = window.prompt(t('chat.renamePrompt'), agent?.name || '');
        if (newName && newName.trim() && id) {
          api.renameAgent(id, newName.trim()).then(() => {
            addLocalMessage(`${t('chat.renamed')} ${newName.trim()}`);
            fetchAgent();
          });
        }
        break;
      }
      case '/tasks':
        api.getTasks().then((tasks) => {
          if (tasks.length === 0) {
            addLocalMessage(t('chat.noTasks'));
          } else {
            const taskLines = tasks.map(tk =>
              `[${tk.status}] ${tk.name} (step ${tk.order})${tk.error ? ' - ' + tk.error : ''}`
            );
            addLocalMessage(taskLines.join('\n'));
          }
        });
        break;
      case '/theme':
        toggleTheme();
        addLocalMessage(t('chat.themeToggled'));
        break;
      case '/todos': {
        if (agent) {
          const todoPattern = /\b(TODO|FIXME|HACK|XXX|NOTE)\b[:\s]*(.*)/gi;
          const todos: string[] = [];
          for (const msg of agent.messages) {
            let match;
            while ((match = todoPattern.exec(msg.content)) !== null) {
              todos.push(`${match[1]}: ${match[2].trim()}`);
            }
          }
          if (todos.length === 0) {
            addLocalMessage(t('chat.noTodos'));
          } else {
            addLocalMessage(`${t('chat.todosFound')}\n${todos.join('\n')}`);
          }
        }
        break;
      }
      case '/usage':
        if (agent) {
          const usageLines = [
            `${t('chat.usageInfo')}:`,
            agent.costUsd !== undefined ? `Cost: $${agent.costUsd.toFixed(4)}` : 'Cost: N/A',
            agent.tokenUsage ? `Tokens: ${(agent.tokenUsage.input + agent.tokenUsage.output).toLocaleString()}` : 'Tokens: N/A',
            `Messages: ${agent.messages.length}`,
            `Provider: ${(agent.config.provider || 'claude').toUpperCase()}`,
          ].join('\n');
          addLocalMessage(usageLines);
        }
        fetchAgent();
        break;
    }
  };

  const handleSend = () => {
    if (!input.trim() || !id) return;

    if (input.startsWith('/')) {
      // Handle commands with arguments (e.g., /compact [instructions])
      const parts = input.trim().split(/\s+/);
      const cmdName = parts[0];
      const args = parts.slice(1).join(' ');

      const cmd = slashCommands.find((c) => c.cmd === cmdName);
      if (cmd) {
        // For /compact with args, send as message to agent
        if (cmdName === '/compact' && args) {
          api.sendMessage(id, input.trim());
          setInput('');
          addLocalMessage(t('chat.compactMsg'));
          return;
        }
        handleSlashSelect(cmd.cmd);
        return;
      }
    }

    api.sendMessage(id, input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash) {
      const filtered = slashCommands.filter((c) =>
        c.cmd.startsWith(slashFilter),
      );
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedHint((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedHint((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedHint]) {
          handleSlashSelect(filtered[selectedHint].cmd);
        }
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveClaudeMd = async () => {
    if (!id) return;
    await api.updateClaudeMd(id, claudeMdContent);
    setEditingClaudeMd(false);
  };

  const filteredCommands = slashCommands.filter((c) =>
    c.cmd.startsWith(slashFilter || '/'),
  );

  if (!agent) return <div>{t('common.loading')}</div>;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>
            <span className={`provider-badge provider-${agent.config.provider || 'claude'}`}>
              {(agent.config.provider || 'claude').toUpperCase()}
            </span>
            {' '}{agent.name}
          </h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {agent.config.directory}
            {agent.costUsd !== undefined && ` | $${agent.costUsd.toFixed(4)}`}
            {agent.tokenUsage && ` | ${agent.tokenUsage.input + agent.tokenUsage.output} ${t('common.tokens')}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`status status-${agent.status}`}>
            <span className="status-dot" />
            {agent.status}
          </span>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => {
              setClaudeMdContent(agent.config.claudeMd || '');
              setEditingClaudeMd(true);
            }}
          >
            {t('chat.editClaudeMd')}
          </button>
          {(agent.status === 'running' || agent.status === 'waiting_input') && (
            <button className="btn btn-sm btn-danger" onClick={() => id && api.stopAgent(id)}>
              {t('common.stop')}
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {agent.messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {localMessages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="esc-hint">{t('chat.escHint')}</div>

      <div style={{ position: 'relative' }}>
        {showSlash && filteredCommands.length > 0 && (
          <div className="slash-hints">
            {filteredCommands.map((cmd, i) => (
              <div
                key={cmd.cmd}
                className={`slash-hint ${i === selectedHint ? 'selected' : ''}`}
                onClick={() => handleSlashSelect(cmd.cmd)}
              >
                <strong>{cmd.cmd}</strong>{' '}
                <span style={{ color: 'var(--text-muted)' }}>{cmd.desc}</span>
              </div>
            ))}
          </div>
        )}
        <div className="chat-input-area">
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.inputPlaceholder')}
            autoFocus
          />
          <button className="btn" onClick={handleSend}>
            {t('common.send')}
          </button>
        </div>
      </div>

      {editingClaudeMd && (
        <div className="modal-overlay" onClick={() => setEditingClaudeMd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('chat.editClaudeMdTitle')}</span>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setEditingClaudeMd(false)}
              >
                {t('common.cancel')}
              </button>
            </div>
            <textarea
              value={claudeMdContent}
              onChange={(e) => setClaudeMdContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: 300,
                padding: 12,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text)',
                fontFamily: 'monospace',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={handleSaveClaudeMd}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
