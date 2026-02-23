import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import { AgentStore } from '../src/store/AgentStore.js';
import { AgentManager } from '../src/services/AgentManager.js';
import { MetaAgentManager } from '../src/services/MetaAgentManager.js';
import { taskRoutes } from '../src/routes/tasks.js';

// Simple test helper (same pattern as routes.test.ts)
async function request(app: express.Express, method: string, url: string, body?: unknown) {
  const { createServer } = await import('http');

  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Bad address'));
        return;
      }

      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) options.body = JSON.stringify(body);

      fetch(`http://127.0.0.1:${addr.port}${url}`, options)
        .then(async (res) => {
          const json = await res.json().catch(() => null);
          server.close();
          resolve({ status: res.status, body: json });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe('Task Routes', () => {
  let tmpDir: string;
  let app: express.Express;
  let store: AgentStore;
  let metaAgent: MetaAgentManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskroutes-test-'));
    store = new AgentStore(tmpDir);
    const agentManager = new AgentManager(store);
    metaAgent = new MetaAgentManager(store, agentManager);

    app = express();
    app.use(express.json());
    app.use('/api/tasks', taskRoutes(store, metaAgent));
  });

  afterEach(() => {
    metaAgent.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates and lists tasks', async () => {
    const res = await request(app, 'POST', '/api/tasks', {
      name: 'Task 1',
      prompt: 'Do X',
    });
    expect(res.status).toBe(201);
    expect((res.body as { name: string }).name).toBe('Task 1');

    const list = await request(app, 'GET', '/api/tasks');
    expect((list.body as unknown[]).length).toBe(1);
  });

  it('rejects task without name or prompt', async () => {
    const res = await request(app, 'POST', '/api/tasks', { name: 'No prompt' });
    expect(res.status).toBe(400);
  });

  it('deletes a task', async () => {
    const create = await request(app, 'POST', '/api/tasks', {
      name: 'To Delete',
      prompt: 'P',
    });
    const id = (create.body as { id: string }).id;

    const del = await request(app, 'DELETE', `/api/tasks/${id}`);
    expect(del.status).toBe(200);

    const list = await request(app, 'GET', '/api/tasks');
    expect((list.body as unknown[]).length).toBe(0);
  });

  it('gets meta agent config', async () => {
    const res = await request(app, 'GET', '/api/tasks/meta/config');
    expect(res.status).toBe(200);
    const body = res.body as { claudeMd: string; running: boolean };
    expect(body.claudeMd).toBeDefined();
    expect(body.running).toBe(false);
  });

  it('starts and stops meta agent', async () => {
    let res = await request(app, 'POST', '/api/tasks/meta/start');
    expect((res.body as { running: boolean }).running).toBe(true);

    res = await request(app, 'GET', '/api/tasks/meta/status');
    expect((res.body as { running: boolean }).running).toBe(true);

    res = await request(app, 'POST', '/api/tasks/meta/stop');
    expect((res.body as { running: boolean }).running).toBe(false);
  });

  it('resets a failed task', async () => {
    const create = await request(app, 'POST', '/api/tasks', {
      name: 'Fail Task',
      prompt: 'P',
    });
    const id = (create.body as { id: string }).id;

    // Manually set to failed
    const task = store.getTask(id)!;
    task.status = 'failed';
    task.error = 'test error';
    store.saveTask(task);

    const res = await request(app, 'POST', `/api/tasks/${id}/reset`);
    expect(res.status).toBe(200);
    const body = res.body as { status: string; error?: string };
    expect(body.status).toBe('pending');
    expect(body.error).toBeUndefined();
  });
});
