import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { AgentStore } from '../store/AgentStore.js';
import type { MetaAgentManager } from '../services/MetaAgentManager.js';
import type { PipelineTask } from '../models/Task.js';

export function taskRoutes(store: AgentStore, metaAgent: MetaAgentManager): Router {
  const router = Router();

  // List all tasks
  router.get('/', (_req, res) => {
    const tasks = store.getAllTasks();
    res.json(tasks);
  });

  // Get single task
  router.get('/:id', (req, res) => {
    const task = store.getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  });

  // Create task
  router.post('/', (req, res) => {
    const { name, prompt, directory, provider, model, claudeMd, flags, order } = req.body;

    if (!name || !prompt) {
      res.status(400).json({ error: 'name and prompt are required' });
      return;
    }

    // If no order specified, put it after all existing tasks
    let taskOrder = order;
    if (taskOrder === undefined) {
      const tasks = store.getAllTasks();
      taskOrder = tasks.length > 0
        ? Math.max(...tasks.map(t => t.order)) + 1
        : 0;
    }

    const task: PipelineTask = {
      id: uuid(),
      name,
      prompt,
      directory,
      provider,
      model,
      claudeMd,
      flags,
      status: 'pending',
      order: taskOrder,
      createdAt: Date.now(),
    };

    store.saveTask(task);
    res.status(201).json(task);
  });

  // Update task
  router.put('/:id', (req, res) => {
    const task = store.getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Only allow updates to pending tasks
    if (task.status !== 'pending') {
      res.status(400).json({ error: 'Can only update pending tasks' });
      return;
    }

    const { name, prompt, directory, provider, model, claudeMd, flags, order } = req.body;
    if (name !== undefined) task.name = name;
    if (prompt !== undefined) task.prompt = prompt;
    if (directory !== undefined) task.directory = directory;
    if (provider !== undefined) task.provider = provider;
    if (model !== undefined) task.model = model;
    if (claudeMd !== undefined) task.claudeMd = claudeMd;
    if (flags !== undefined) task.flags = flags;
    if (order !== undefined) task.order = order;

    store.saveTask(task);
    res.json(task);
  });

  // Delete task
  router.delete('/:id', (req, res) => {
    const deleted = store.deleteTask(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ ok: true });
  });

  // Clear completed/failed tasks
  router.post('/actions/clear-completed', (_req, res) => {
    store.clearCompletedTasks();
    res.json({ ok: true });
  });

  // Reset a failed task back to pending
  router.post('/:id/reset', (req, res) => {
    const task = store.getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.status !== 'failed' && task.status !== 'completed') {
      res.status(400).json({ error: 'Can only reset completed or failed tasks' });
      return;
    }
    task.status = 'pending';
    task.agentId = undefined;
    task.completedAt = undefined;
    task.error = undefined;
    store.saveTask(task);
    res.json(task);
  });

  // Meta agent routes
  router.get('/meta/config', (_req, res) => {
    const cfg = metaAgent.getConfig();
    res.json(cfg);
  });

  router.put('/meta/config', (req, res) => {
    const cfg = metaAgent.updateConfig(req.body);
    res.json(cfg);
  });

  router.post('/meta/start', (_req, res) => {
    metaAgent.start();
    res.json({ ok: true, running: true });
  });

  router.post('/meta/stop', (_req, res) => {
    metaAgent.stop();
    res.json({ ok: true, running: false });
  });

  router.get('/meta/status', (_req, res) => {
    res.json({ running: metaAgent.isRunning() });
  });

  return router;
}
