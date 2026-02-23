const BASE = '/api';

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'waiting_input';
  config: {
    directory: string;
    prompt: string;
    claudeMd?: string;
    adminEmail?: string;
    flags: Record<string, unknown>;
  };
  worktreePath?: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: number;
  }>;
  lastActivity: number;
  createdAt: number;
  costUsd?: number;
}

export interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface SessionInfo {
  id: string;
  projectPath: string;
  lastModified: number;
}

export interface DirListing {
  path: string;
  parent: string;
  entries: Array<{ name: string; path: string; isDirectory: boolean }>;
}

export const api = {
  // Agents
  getAgents: () => request<Agent[]>('/agents'),
  getAgent: (id: string) => request<Agent>(`/agents/${id}`),
  createAgent: (data: {
    name: string;
    directory: string;
    prompt: string;
    claudeMd?: string;
    adminEmail?: string;
    flags?: Record<string, unknown>;
  }) => request<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
  stopAgent: (id: string) =>
    request('/agents/' + id + '/stop', { method: 'POST' }),
  stopAllAgents: () =>
    request('/agents/actions/stop-all', { method: 'POST' }),
  deleteAgent: (id: string) =>
    request('/agents/' + id, { method: 'DELETE' }),
  sendMessage: (id: string, text: string) =>
    request('/agents/' + id + '/message', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  interruptAgent: (id: string) =>
    request('/agents/' + id + '/interrupt', { method: 'POST' }),
  updateClaudeMd: (id: string, content: string) =>
    request('/agents/' + id + '/claude-md', {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),

  // Templates
  getTemplates: () => request<Template[]>('/templates'),
  getTemplate: (id: string) => request<Template>(`/templates/${id}`),
  createTemplate: (data: { name: string; content: string }) =>
    request<Template>('/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: string, data: { name?: string; content?: string }) =>
    request<Template>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTemplate: (id: string) =>
    request(`/templates/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: () => request<SessionInfo[]>('/sessions'),

  // Directories
  listDirectory: (path?: string) =>
    request<DirListing>(`/directories${path ? `?path=${encodeURIComponent(path)}` : ''}`),
};
