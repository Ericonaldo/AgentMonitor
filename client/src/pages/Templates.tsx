import { useState, useEffect } from 'react';
import { api, type Template } from '../api/client';
import { useTranslation } from '../i18n';

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const { t } = useTranslation();

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

  const startEdit = (tmpl: Template) => {
    setEditing(tmpl);
    setName(tmpl.name);
    setContent(tmpl.content);
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
        <h1 className="page-title">{t('templates.title')}</h1>
        {!isFormOpen && (
          <button className="btn" onClick={startCreate}>
            {t('templates.newTemplate')}
          </button>
        )}
      </div>

      {isFormOpen && (
        <div style={{ marginBottom: 24 }}>
          <div className="form-group">
            <label>{t('templates.templateName')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('templates.templateNamePlaceholder')} />
          </div>
          <div className="form-group">
            <label>{t('templates.content')}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('templates.contentPlaceholder')}
              style={{ minHeight: 200 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={editing ? handleUpdate : handleCreate}>
              {editing ? t('common.update') : t('common.create')}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="template-list">
        {templates.length === 0 && !isFormOpen ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            {t('templates.empty')}
          </div>
        ) : (
          templates.map((tmpl) => (
            <div key={tmpl.id} className="template-item">
              <div>
                <div className="template-item-name">{tmpl.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {tmpl.content.slice(0, 80)}
                  {tmpl.content.length > 80 ? '...' : ''}
                </div>
              </div>
              <div className="template-actions">
                <button className="btn btn-sm btn-outline" onClick={() => startEdit(tmpl)}>
                  {t('common.edit')}
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tmpl.id)}>
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
