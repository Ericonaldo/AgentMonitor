import { Router } from 'express';
import { SessionReader } from '../services/SessionReader.js';

export function sessionRoutes(): Router {
  const router = Router();
  const reader = new SessionReader();

  router.get('/', (_req, res) => {
    try {
      const sessions = reader.listSessions();
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
