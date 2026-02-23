import { Router } from 'express';
import { DirectoryBrowser } from '../services/DirectoryBrowser.js';

export function directoryRoutes(): Router {
  const router = Router();
  const browser = new DirectoryBrowser();

  router.get('/', (req, res) => {
    try {
      const dirPath = (req.query.path as string) || process.env.HOME || '/';
      const entries = browser.listDirectory(dirPath);
      const parent = browser.getParent(dirPath);
      res.json({ path: dirPath, parent, entries });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  return router;
}
