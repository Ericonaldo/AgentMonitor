import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { AgentStore } from './store/AgentStore.js';
import { AgentManager } from './services/AgentManager.js';
import { agentRoutes } from './routes/agents.js';
import { templateRoutes } from './routes/templates.js';
import { sessionRoutes } from './routes/sessions.js';
import { directoryRoutes } from './routes/directories.js';
import { setupSocketHandlers } from './socket/handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  app.use(cors());
  app.use(express.json());

  const store = new AgentStore();
  const manager = new AgentManager(store);

  // REST routes
  app.use('/api/agents', agentRoutes(manager));
  app.use('/api/templates', templateRoutes(store));
  app.use('/api/sessions', sessionRoutes());
  app.use('/api/directories', directoryRoutes());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Serve built client
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // Socket.IO
  setupSocketHandlers(io, manager);

  return { app, httpServer, io, store, manager };
}

// Only start server if this is the main module
const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const { httpServer } = createApp();
  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`Agent Monitor server running on port ${config.port}`);
  });
}
