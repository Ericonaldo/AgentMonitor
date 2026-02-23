import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentStore } from '../src/store/AgentStore.js';
import type { Agent } from '../src/models/Agent.js';
import type { Template } from '../src/models/Template.js';

describe('AgentStore', () => {
  let tmpDir: string;
  let store: AgentStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentstore-test-'));
    store = new AgentStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and retrieves an agent', () => {
    const agent: Agent = {
      id: 'test-1',
      name: 'Test Agent',
      status: 'running',
      config: {
        directory: '/tmp',
        prompt: 'hello',
        flags: {},
      },
      messages: [],
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };

    store.saveAgent(agent);
    const retrieved = store.getAgent('test-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Test Agent');
  });

  it('lists all agents', () => {
    const agent1: Agent = {
      id: 'a1',
      name: 'Agent 1',
      status: 'running',
      config: { directory: '/tmp', prompt: 'p1', flags: {} },
      messages: [],
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };
    const agent2: Agent = {
      id: 'a2',
      name: 'Agent 2',
      status: 'stopped',
      config: { directory: '/tmp', prompt: 'p2', flags: {} },
      messages: [],
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };

    store.saveAgent(agent1);
    store.saveAgent(agent2);

    const all = store.getAllAgents();
    expect(all).toHaveLength(2);
  });

  it('deletes an agent', () => {
    const agent: Agent = {
      id: 'del-1',
      name: 'To Delete',
      status: 'stopped',
      config: { directory: '/tmp', prompt: 'p', flags: {} },
      messages: [],
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };

    store.saveAgent(agent);
    expect(store.deleteAgent('del-1')).toBe(true);
    expect(store.getAgent('del-1')).toBeUndefined();
  });

  it('persists agents to disk and reloads', () => {
    const agent: Agent = {
      id: 'persist-1',
      name: 'Persistent',
      status: 'running',
      config: { directory: '/tmp', prompt: 'p', flags: {} },
      messages: [],
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };

    store.saveAgent(agent);

    // Create new store from same dir
    const store2 = new AgentStore(tmpDir);
    const retrieved = store2.getAgent('persist-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Persistent');
  });

  it('saves and retrieves templates', () => {
    const template: Template = {
      id: 't1',
      name: 'Default',
      content: '# My Template',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    store.saveTemplate(template);
    const retrieved = store.getTemplate('t1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.content).toBe('# My Template');
  });

  it('lists all templates', () => {
    store.saveTemplate({
      id: 't1',
      name: 'T1',
      content: 'c1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    store.saveTemplate({
      id: 't2',
      name: 'T2',
      content: 'c2',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    expect(store.getAllTemplates()).toHaveLength(2);
  });

  it('deletes a template', () => {
    store.saveTemplate({
      id: 'tdel',
      name: 'T',
      content: 'c',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    expect(store.deleteTemplate('tdel')).toBe(true);
    expect(store.getTemplate('tdel')).toBeUndefined();
  });
});
