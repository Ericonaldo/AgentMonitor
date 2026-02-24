import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type AgentProvider, type Template, type SessionInfo, type DirListing } from '../api/client';
import { useTranslation } from '../i18n';

export function CreateAgent() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [provider, setProvider] = useState<AgentProvider>('claude');
  const [name, setName] = useState('');
  const [directory, setDirectory] = useState('');
  const [prompt, setPrompt] = useState('');
  const [claudeMd, setClaudeMd] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [skipPermissions, setSkipPermissions] = useState(false);
  const [fullAuto, setFullAuto] = useState(false);
  const [chrome, setChrome] = useState(false);
  const [permissionMode, setPermissionMode] = useState('');
  const [maxBudgetUsd, setMaxBudgetUsd] = useState('');
  const [allowedTools, setAllowedTools] = useState('');
  const [disallowedTools, setDisallowedTools] = useState('');
  const [addDirs, setAddDirs] = useState('');
  const [mcpConfig, setMcpConfig] = useState('');
  const [resumeSession, setResumeSession] = useState('');
  const [model, setModel] = useState('');
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
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) setClaudeMd(tmpl.content);
  };

  const handleCreate = async () => {
    if (!name || !directory || !prompt) {
      setError(t('create.requiredFields'));
      return;
    }
    setCreating(true);
    setError('');
    try {
      const agent = await api.createAgent({
        name,
        provider,
        directory,
        prompt,
        claudeMd: claudeMd || undefined,
        adminEmail: adminEmail || undefined,
        whatsappPhone: whatsappPhone || undefined,
        slackWebhookUrl: slackWebhookUrl || undefined,
        flags: {
          dangerouslySkipPermissions: skipPermissions || undefined,
          fullAuto: fullAuto || undefined,
          chrome: chrome || undefined,
          permissionMode: permissionMode || undefined,
          maxBudgetUsd: maxBudgetUsd ? Number(maxBudgetUsd) : undefined,
          allowedTools: allowedTools || undefined,
          disallowedTools: disallowedTools || undefined,
          addDirs: addDirs || undefined,
          mcpConfig: mcpConfig || undefined,
          resume: resumeSession || undefined,
          model: model || undefined,
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
        <h1 className="page-title">{t('create.title')}</h1>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--red)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label>{t('common.provider')}</label>
        <div className="provider-selector">
          <button
            className={`provider-btn ${provider === 'claude' ? 'active' : ''}`}
            onClick={() => setProvider('claude')}
            type="button"
          >
            {t('common.claudeCode')}
          </button>
          <button
            className={`provider-btn ${provider === 'codex' ? 'active' : ''}`}
            onClick={() => setProvider('codex')}
            type="button"
          >
            {t('common.codex')}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>{t('create.name')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('create.namePlaceholder')} />
      </div>

      <div className="form-group">
        <label>{t('create.workingDir')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={directory}
            onChange={(e) => setDirectory(e.target.value)}
            placeholder={t('create.workingDirPlaceholder')}
          />
          <button className="btn btn-outline" onClick={() => browseTo(directory || undefined)}>
            {t('common.browse')}
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
                  {t('common.select')}
                </button>
              </div>
            ))}
          <div style={{ padding: '6px 12px' }}>
            <button className="btn btn-sm" onClick={() => selectDir(dirListing.path)}>
              {t('create.selectCurrent')} {dirListing.path}
            </button>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>{t('create.prompt')}</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('create.promptPlaceholder')}
        />
      </div>

      <div className="form-group">
        <label>{t('create.model')}</label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={provider === 'claude' ? 'e.g. claude-sonnet-4-5-20250514' : 'e.g. o3'}
        />
      </div>

      <div className="form-group">
        <label>{t('create.flags')}</label>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={skipPermissions}
              onChange={(e) => setSkipPermissions(e.target.checked)}
            />
            {provider === 'claude'
              ? '--dangerously-skip-permissions'
              : '--dangerously-bypass-approvals-and-sandbox'}
          </label>
          {provider === 'codex' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={fullAuto}
                onChange={(e) => setFullAuto(e.target.checked)}
              />
              --full-auto
            </label>
          )}
          {provider === 'claude' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={chrome}
                onChange={(e) => setChrome(e.target.checked)}
              />
              --chrome
            </label>
          )}
        </div>
      </div>

      {provider === 'claude' && (
        <>
          <div className="form-group">
            <label>--permission-mode</label>
            <select value={permissionMode} onChange={(e) => setPermissionMode(e.target.value)}>
              <option value="">Default</option>
              <option value="default">default</option>
              <option value="acceptEdits">acceptEdits</option>
              <option value="bypassPermissions">bypassPermissions</option>
              <option value="dontAsk">dontAsk</option>
              <option value="plan">plan</option>
            </select>
          </div>

          <div className="form-group">
            <label>--max-budget-usd</label>
            <input
              value={maxBudgetUsd}
              onChange={(e) => setMaxBudgetUsd(e.target.value)}
              placeholder="e.g. 5.00"
              type="number"
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label>--allowedTools</label>
            <input
              value={allowedTools}
              onChange={(e) => setAllowedTools(e.target.value)}
              placeholder='e.g. Bash(git:*) Edit Read'
            />
          </div>

          <div className="form-group">
            <label>--disallowedTools</label>
            <input
              value={disallowedTools}
              onChange={(e) => setDisallowedTools(e.target.value)}
              placeholder='e.g. Bash(rm:*) Write'
            />
          </div>

          <div className="form-group">
            <label>--add-dir</label>
            <input
              value={addDirs}
              onChange={(e) => setAddDirs(e.target.value)}
              placeholder="Additional directories (comma-separated)"
            />
          </div>

          <div className="form-group">
            <label>--mcp-config</label>
            <input
              value={mcpConfig}
              onChange={(e) => setMcpConfig(e.target.value)}
              placeholder="Path to MCP config JSON file"
            />
          </div>
        </>
      )}

      {provider === 'claude' && (
        <div className="form-group">
          <label>{t('create.resumeSession')}</label>
          <select value={resumeSession} onChange={(e) => setResumeSession(e.target.value)}>
            <option value="">{t('create.newSession')}</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.projectPath} - {new Date(s.lastModified).toLocaleString()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>
          {t('create.claudeMd')}{' '}
          {templates.length > 0 && (
            <select
              style={{ marginLeft: 8, padding: '2px 4px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12 }}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>{t('create.loadTemplate')}</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
              ))}
            </select>
          )}
        </label>
        <textarea
          value={claudeMd}
          onChange={(e) => setClaudeMd(e.target.value)}
          placeholder={t('create.claudeMdPlaceholder')}
          style={{ minHeight: 160 }}
        />
      </div>

      <div className="form-group">
        <label>{t('create.adminEmail')}</label>
        <input
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder={t('create.adminEmailPlaceholder')}
          type="email"
        />
      </div>

      <div className="form-group">
        <label>{t('create.whatsappPhone')}</label>
        <input
          value={whatsappPhone}
          onChange={(e) => setWhatsappPhone(e.target.value)}
          placeholder={t('create.whatsappPhonePlaceholder')}
          type="tel"
        />
      </div>

      <div className="form-group">
        <label>{t('create.slackWebhook')}</label>
        <input
          value={slackWebhookUrl}
          onChange={(e) => setSlackWebhookUrl(e.target.value)}
          placeholder={t('create.slackWebhookPlaceholder')}
          type="url"
        />
      </div>

      <button className="btn" onClick={handleCreate} disabled={creating}>
        {creating ? t('create.creating') : t('create.createAgent')}
      </button>
    </div>
  );
}
