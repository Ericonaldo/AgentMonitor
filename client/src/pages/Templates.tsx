import { useState, useEffect } from 'react';
import { api, type Template } from '../api/client';

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const fetchTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    if (!name || content === undefined) return;
    await api.createTemplate({ name, content });
    setName('');
    setContent('');
    setCreating(false);
    fetchTemplates();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    await api.updateTemplate(editing.id, { name, content });
    setEditing(null);
    setName('');
    setContent('');
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await api.deleteTemplate(id);
    fetchTemplates();
  };

  const startEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setContent(t.content);
    setCreating(false);
  };

  const startCreate = () => {
    setEditing(null);
    setName('');
    setContent('');
    setCreating(true);
  };

  const isFormOpen = creating || editing !== null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">CLAUDE.md Templates</h1>
        {!isFormOpen && (
          <button className="btn" onClick={startCreate}>
            + New Template
          </button>
        )}
      </div>

      {isFormOpen && (
        <div style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label>Template Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My template" />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="CLAUDE.md content..."
              style={{ minHeight: 200 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={editing ? handleUpdate : handleCreate}>
              {editing ? 'Update' : 'Create'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="template-list">
        {templates.length === 0 && !isFormOpen ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            No templates yet. Create one to get started.
          </div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="template-item">
              <div>
                <div className="template-item-name">{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {t.content.slice(0, 80)}
                  {t.content.length > 80 ? '...' : ''}
                </div>
              </div>
              <div className="template-actions">
                <button className="btn btn-sm btn-outline" onClick={() => startEdit(t)}>
                  Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
