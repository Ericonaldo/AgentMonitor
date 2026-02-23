import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Agent } from '../api/client';
import { getSocket, joinAgent, leaveAgent } from '../api/socket';

const SLASH_COMMANDS = [
  { cmd: '/help', desc: 'Show available commands' },
  { cmd: '/clear', desc: 'Clear chat display' },
  { cmd: '/status', desc: 'Show agent status' },
  { cmd: '/cost', desc: 'Show current cost' },
  { cmd: '/stop', desc: 'Stop the agent' },
];

export function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [input, setInput] = useState('');
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedHint, setSelectedHint] = useState(0);
  const [editingClaudeMd, setEditingClaudeMd] = useState(false);
  const [claudeMdContent, setClaudeMdContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastEscRef = useRef(0);

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
      case '/help':
        // local display only
        break;
      case '/clear':
        // nothing to do on server
        break;
      case '/status':
        fetchAgent();
        break;
      case '/cost':
        fetchAgent();
        break;
      case '/stop':
        if (id) api.stopAgent(id);
        break;
    }
  };

  const handleSend = () => {
    if (!input.trim() || !id) return;

    if (input.startsWith('/')) {
      const cmd = SLASH_COMMANDS.find((c) => c.cmd === input.trim());
      if (cmd) {
        handleSlashSelect(cmd.cmd);
        return;
      }
    }

    api.sendMessage(id, input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash) {
      const filtered = SLASH_COMMANDS.filter((c) =>
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

  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.cmd.startsWith(slashFilter || '/'),
  );

  if (!agent) return <div>Loading...</div>;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>{agent.name}</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {agent.config.directory}
            {agent.costUsd !== undefined && ` | $${agent.costUsd.toFixed(4)}`}
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
            Edit CLAUDE.md
          </button>
          {(agent.status === 'running' || agent.status === 'waiting_input') && (
            <button className="btn btn-sm btn-danger" onClick={() => id && api.stopAgent(id)}>
              Stop
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
        <div ref={messagesEndRef} />
      </div>

      <div className="esc-hint">Press Esc twice to interrupt the agent</div>

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
            placeholder="Type a message or / for commands..."
            autoFocus
          />
          <button className="btn" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>

      {editingClaudeMd && (
        <div className="modal-overlay" onClick={() => setEditingClaudeMd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Edit CLAUDE.md</span>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setEditingClaudeMd(false)}
              >
                Cancel
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
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
