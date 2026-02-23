import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentStore } from '../src/store/AgentStore.js';
import type { PipelineTask, MetaAgentConfig } from '../src/models/Task.js';

describe('AgentStore - Tasks', () => {
  let tmpDir: string;
  let store: AgentStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskstore-test-'));
    store = new AgentStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('saves and retrieves a task', () => {
    const task: PipelineTask = {
      id: 'task-1',
      name: 'Test Task',
      prompt: 'Do something',
      status: 'pending',
      order: 0,
      createdAt: Date.now(),
    };

    store.saveTask(task);
    const retrieved = store.getTask('task-1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Test Task');
    expect(retrieved!.prompt).toBe('Do something');
  });

  it('lists all tasks sorted by order', () => {
    store.saveTask({
      id: 't1', name: 'Task B', prompt: 'p1', status: 'pending', order: 2, createdAt: Date.now(),
    });
    store.saveTask({
      id: 't2', name: 'Task A', prompt: 'p2', status: 'pending', order: 0, createdAt: Date.now(),
    });
    store.saveTask({
      id: 't3', name: 'Task C', prompt: 'p3', status: 'pending', order: 1, createdAt: Date.now(),
    });

    const all = store.getAllTasks();
    expect(all).toHaveLength(3);
    expect(all[0].name).toBe('Task A'); // order 0
    expect(all[1].name).toBe('Task C'); // order 1
    expect(all[2].name).toBe('Task B'); // order 2
  });

  it('deletes a task', () => {
    store.saveTask({
      id: 'tdel', name: 'T', prompt: 'p', status: 'pending', order: 0, createdAt: Date.now(),
    });
    expect(store.deleteTask('tdel')).toBe(true);
    expect(store.getTask('tdel')).toBeUndefined();
  });

  it('clears completed and failed tasks', () => {
    store.saveTask({
      id: 't1', name: 'Done', prompt: 'p', status: 'completed', order: 0, createdAt: Date.now(),
    });
    store.saveTask({
      id: 't2', name: 'Failed', prompt: 'p', status: 'failed', order: 1, createdAt: Date.now(),
    });
    store.saveTask({
      id: 't3', name: 'Pending', prompt: 'p', status: 'pending', order: 2, createdAt: Date.now(),
    });

    store.clearCompletedTasks();
    const remaining = store.getAllTasks();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('Pending');
  });

  it('persists tasks to disk and reloads', () => {
    store.saveTask({
      id: 'tp1', name: 'Persistent', prompt: 'p', status: 'pending', order: 0, createdAt: Date.now(),
    });

    const store2 = new AgentStore(tmpDir);
    const retrieved = store2.getTask('tp1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('Persistent');
  });

  it('saves and retrieves meta agent config', () => {
    const cfg: MetaAgentConfig = {
      running: false,
      claudeMd: '# Test',
      defaultDirectory: '/tmp',
      defaultProvider: 'claude',
      pollIntervalMs: 3000,
    };

    store.saveMetaAgentConfig(cfg);
    const retrieved = store.getMetaConfig();
    expect(retrieved).toBeDefined();
    expect(retrieved!.claudeMd).toBe('# Test');
    expect(retrieved!.pollIntervalMs).toBe(3000);
  });

  it('persists meta config to disk and reloads', () => {
    store.saveMetaAgentConfig({
      running: false,
      claudeMd: '# Persisted',
      defaultDirectory: '/home',
      defaultProvider: 'codex',
      pollIntervalMs: 10000,
    });

    const store2 = new AgentStore(tmpDir);
    const cfg = store2.getMetaConfig();
    expect(cfg).toBeDefined();
    expect(cfg!.defaultProvider).toBe('codex');
  });
});
