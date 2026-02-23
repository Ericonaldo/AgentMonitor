import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import { AgentStore } from '../src/store/AgentStore.js';
import { templateRoutes } from '../src/routes/templates.js';
import { directoryRoutes } from '../src/routes/directories.js';

// Simple test helper
async function request(app: express.Express, method: string, url: string, body?: unknown) {
  // Use a simple approach - create a test server
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

describe('Template routes', () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-test-'));
    const store = new AgentStore(tmpDir);
    app = express();
    app.use(express.json());
    app.use('/api/templates', templateRoutes(store));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates and lists templates', async () => {
    const createRes = await request(app, 'POST', '/api/templates', {
      name: 'Test',
      content: '# Test',
    });
    expect(createRes.status).toBe(201);

    const listRes = await request(app, 'GET', '/api/templates');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect((listRes.body as unknown[]).length).toBe(1);
  });

  it('rejects template without name', async () => {
    const res = await request(app, 'POST', '/api/templates', { content: 'x' });
    expect(res.status).toBe(400);
  });
});

describe('Directory routes', () => {
  let tmpDir: string;
  let app: express.Express;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dirroutes-test-'));
    fs.mkdirSync(path.join(tmpDir, 'testdir'));
    app = express();
    app.use(express.json());
    app.use('/api/directories', directoryRoutes());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists directory contents', async () => {
    const res = await request(
      app,
      'GET',
      `/api/directories?path=${encodeURIComponent(tmpDir)}`,
    );
    expect(res.status).toBe(200);
    const body = res.body as { entries: unknown[] };
    expect(body.entries).toBeDefined();
  });
});
