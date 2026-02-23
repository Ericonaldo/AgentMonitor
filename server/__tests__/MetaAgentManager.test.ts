import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentStore } from '../src/store/AgentStore.js';
import { AgentManager } from '../src/services/AgentManager.js';
import { MetaAgentManager } from '../src/services/MetaAgentManager.js';
import type { PipelineTask } from '../src/models/Task.js';

describe('MetaAgentManager', () => {
  let tmpDir: string;
  let store: AgentStore;
  let agentManager: AgentManager;
  let metaAgent: MetaAgentManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-test-'));
    store = new AgentStore(tmpDir);
    agentManager = new AgentManager(store);
    metaAgent = new MetaAgentManager(store, agentManager);
  });

  afterEach(() => {
    metaAgent.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('starts and stops correctly', () => {
    expect(metaAgent.isRunning()).toBe(false);
    metaAgent.start();
    expect(metaAgent.isRunning()).toBe(true);
    metaAgent.stop();
    expect(metaAgent.isRunning()).toBe(false);
  });

  it('returns default config when none saved', () => {
    const cfg = metaAgent.getConfig();
    expect(cfg.claudeMd).toContain('Agent Manager');
    expect(cfg.running).toBe(false);
    expect(cfg.pollIntervalMs).toBe(5000);
  });

  it('updates config', () => {
    metaAgent.updateConfig({
      defaultDirectory: '/new/dir',
      pollIntervalMs: 10000,
    });
    const cfg = metaAgent.getConfig();
    expect(cfg.defaultDirectory).toBe('/new/dir');
    expect(cfg.pollIntervalMs).toBe(10000);
  });

  it('emits status events on start/stop', () => {
    const events: string[] = [];
    metaAgent.on('status', (s: string) => events.push(s));

    metaAgent.start();
    metaAgent.stop();

    expect(events).toEqual(['running', 'stopped']);
  });

  it('does not double-start', () => {
    metaAgent.start();
    const startCount = metaAgent.listenerCount('status');
    metaAgent.start(); // should be a no-op
    expect(metaAgent.listenerCount('status')).toBe(startCount);
    metaAgent.stop();
  });
});
