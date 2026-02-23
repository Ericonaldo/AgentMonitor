import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Template, type SessionInfo, type DirListing } from '../api/client';

export function CreateAgent() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [directory, setDirectory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [claudeMd, setClaudeMd] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [skipPermissions, setSkipPermissions] = useState(false);
  const [resumeSession, setResumeSession] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Directory browser
  const [dirListing, setDirListing] = useState<DirListing | null>(null);
  const [showDirBrowser, setShowDirBrowser] = useState(false);

  // Templates and sessions
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(() => {});
    api.getSessions().then(setSessions).catch(() => {});
  }, []);

  const browseTo = async (path?: string) => {
    try {
      const listing = await api.listDirectory(path);
      setDirListing(listing);
      setShowDirBrowser(true);
    } catch (err) {
      setError(String(err));
    }
  };

  const selectDir = (path: string) => {
    setDirectory(path);
    setShowDirBrowser(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const t = templates.find((t) => t.id === templateId);
    if (t) setClaudeMd(t.content);
  };

  const handleCreate = async () => {
    if (!name || !directory || !prompt) {
      setError('Name, directory, and prompt are required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const agent = await api.createAgent({
        name,
        directory,
        prompt,
        claudeMd: claudeMd || undefined,
        adminEmail: adminEmail || undefined,
        flags: {
          dangerouslySkipPermissions: skipPermissions || undefined,
          resume: resumeSession || undefined,
        },
      });
      navigate(`/agent/${agent.id}`);
    } catch (err) {
      setError(String(err));
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Create Agent</h1>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--red)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-agent" />
      </div>

      <div className="form-group">
        <label>Working Directory</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={directory}
            onChange={(e) => setDirectory(e.target.value)}
            placeholder="/path/to/project"
          />
          <button className="btn btn-outline" onClick={() => browseTo(directory || undefined)}>
            Browse
          </button>
        </div>
      </div>

      {showDirBrowser && dirListing && (
        <div className="dir-browser" style={{ marginBottom: 16 }}>
          <div
            className="dir-entry is-dir"
            onClick={() => browseTo(dirListing.parent)}
          >
            ..
          </div>
          {dirListing.entries
            .filter((e) => e.isDirectory)
            .map((entry) => (
              <div key={entry.path} className="dir-entry is-dir" style={{ display: 'flex', gap: 8 }}>
                <span onClick={() => browseTo(entry.path)} style={{ flex: 1 }}>
                  {entry.name}/
                </span>
                <button className="btn btn-sm" onClick={() => selectDir(entry.path)}>
                  Select
                </button>
              </div>
            ))}
          <div style={{ padding: '6px 12px' }}>
            <button className="btn btn-sm" onClick={() => selectDir(dirListing.path)}>
              Select current: {dirListing.path}
            </button>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What should the agent do?"
        />
      </div>

      <div className="form-group">
        <label>Flags</label>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={skipPermissions}
              onChange={(e) => setSkipPermissions(e.target.checked)}
            />
            --dangerously-skip-permissions
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>Resume Previous Session</label>
        <select value={resumeSession} onChange={(e) => setResumeSession(e.target.value)}>
          <option value="">New session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.projectPath} - {new Date(s.lastModified).toLocaleString()}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>
          CLAUDE.md{' '}
          {templates.length > 0 && (
            <select
              style={{ marginLeft: 8, padding: '2px 4px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12 }}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Load template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </label>
        <textarea
          value={claudeMd}
          onChange={(e) => setClaudeMd(e.target.value)}
          placeholder="Optional CLAUDE.md content for the agent"
          style={{ minHeight: 160 }}
        />
      </div>

      <div className="form-group">
        <label>Admin Email (for notifications)</label>
        <input
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="admin@example.com"
          type="email"
        />
      </div>

      <button className="btn" onClick={handleCreate} disabled={creating}>
        {creating ? 'Creating...' : 'Create Agent'}
      </button>
    </div>
  );
}
