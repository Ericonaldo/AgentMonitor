import { Router } from 'express';
import type { AgentManager } from '../services/AgentManager.js';

export function agentRoutes(manager: AgentManager): Router {
  const router = Router();

  // List all agents
  router.get('/', (_req, res) => {
    const agents = manager.getAllAgents();
    res.json(agents);
  });

  // Get single agent
  router.get('/:id', (req, res) => {
    const agent = manager.getAgent(req.params.id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json(agent);
  });

  // Create agent
  router.post('/', async (req, res) => {
    try {
      const { name, directory, prompt, claudeMd, adminEmail, flags, provider } = req.body;

      if (!name || !directory || !prompt) {
        res.status(400).json({ error: 'name, directory, and prompt are required' });
        return;
      }

      const agent = await manager.createAgent(name, {
        provider: provider || 'claude',
        directory,
        prompt,
        claudeMd,
        adminEmail,
        flags: flags || {},
      });

      res.status(201).json(agent);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Stop agent
  router.post('/:id/stop', async (req, res) => {
    try {
      await manager.stopAgent(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Stop all agents
  router.post('/actions/stop-all', async (_req, res) => {
    try {
      await manager.stopAllAgents();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Delete agent
  router.delete('/:id', async (req, res) => {
    try {
      await manager.deleteAgent(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Send message to agent
  router.post('/:id/message', (req, res) => {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }
    manager.sendMessage(req.params.id, text);
    res.json({ ok: true });
  });

  // Interrupt agent (double-Esc)
  router.post('/:id/interrupt', (req, res) => {
    manager.interruptAgent(req.params.id);
    res.json({ ok: true });
  });

  // Rename agent
  router.put('/:id/rename', (req, res) => {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    manager.renameAgent(req.params.id, name);
    res.json({ ok: true });
  });

  // Update CLAUDE.md
  router.put('/:id/claude-md', (req, res) => {
    const { content } = req.body;
    if (content === undefined) {
      res.status(400).json({ error: 'content is required' });
      return;
    }
    manager.updateClaudeMd(req.params.id, content);
    res.json({ ok: true });
  });

  return router;
}
