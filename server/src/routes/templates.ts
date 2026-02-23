import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { AgentStore } from '../store/AgentStore.js';
import type { Template } from '../models/Template.js';

export function templateRoutes(store: AgentStore): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(store.getAllTemplates());
  });

  router.get('/:id', (req, res) => {
    const template = store.getTemplate(req.params.id);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json(template);
  });

  router.post('/', (req, res) => {
    const { name, content } = req.body;
    if (!name || content === undefined) {
      res.status(400).json({ error: 'name and content are required' });
      return;
    }

    const template: Template = {
      id: uuid(),
      name,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    store.saveTemplate(template);
    res.status(201).json(template);
  });

  router.put('/:id', (req, res) => {
    const template = store.getTemplate(req.params.id);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const { name, content } = req.body;
    if (name) template.name = name;
    if (content !== undefined) template.content = content;
    template.updatedAt = Date.now();

    store.saveTemplate(template);
    res.json(template);
  });

  router.delete('/:id', (req, res) => {
    const deleted = store.deleteTemplate(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json({ ok: true });
  });

  return router;
}
