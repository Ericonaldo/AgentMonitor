import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config.js';
import { AgentStore } from './store/AgentStore.js';
import { AgentManager } from './services/AgentManager.js';
import { MetaAgentManager } from './services/MetaAgentManager.js';
import { EmailNotifier } from './services/EmailNotifier.js';
import { WhatsAppNotifier } from './services/WhatsAppNotifier.js';
import { SlackNotifier } from './services/SlackNotifier.js';
import { agentRoutes, settingsRoutes } from './routes/agents.js';
import { templateRoutes } from './routes/templates.js';
import { sessionRoutes } from './routes/sessions.js';
import { directoryRoutes } from './routes/directories.js';
import { taskRoutes } from './routes/tasks.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { TunnelClient } from './services/TunnelClient.js';
import { setupTunnelBridge } from './services/tunnelBridge.js';

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
  const emailNotifier = new EmailNotifier();
  const whatsappNotifier = new WhatsAppNotifier();
  const slackNotifier = new SlackNotifier();
  const manager = new AgentManager(store, undefined, emailNotifier, whatsappNotifier, slackNotifier);
  const metaAgent = new MetaAgentManager(store, manager, emailNotifier, whatsappNotifier, slackNotifier);

  // REST routes
  app.use('/api/agents', agentRoutes(manager));
  app.use('/api/templates', templateRoutes(store));
  app.use('/api/sessions', sessionRoutes());
  app.use('/api/directories', directoryRoutes());
  app.use('/api/tasks', taskRoutes(store, metaAgent));
  app.use('/api/settings', settingsRoutes(store));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Serve built docs (VitePress)
  const docsDist = path.resolve(__dirname, '..', '..', 'docs', '.vitepress', 'dist');
  app.use('/docs', express.static(docsDist));
  app.get('/docs/*', (_req, res) => {
    res.sendFile(path.join(docsDist, 'index.html'));
  });

  // Serve built client
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  // Socket.IO
  setupSocketHandlers(io, manager);

  // Forward meta agent events to socket
  metaAgent.on('task:update', (task) => {
    io.emit('task:update', task);
  });
  metaAgent.on('pipeline:complete', () => {
    io.emit('pipeline:complete');
  });
  metaAgent.on('status', (status: string) => {
    io.emit('meta:status', { running: status === 'running' });
  });

  // Auto-cleanup expired stopped/error agents every 60s
  const cleanupInterval = setInterval(async () => {
    const { agentRetentionMs } = store.getSettings();
    if (agentRetentionMs <= 0) return;
    try {
      const count = await manager.cleanupExpiredAgents(agentRetentionMs);
      if (count > 0) {
        console.log(`[Cleanup] Auto-deleted ${count} expired agent(s)`);
        io.emit('agent:status', null, 'deleted');
      }
    } catch (err) {
      console.error('[Cleanup] Error during agent cleanup:', err);
    }
  }, 60_000);

  // Tunnel to relay server (optional - only when RELAY_URL is set)
  let tunnelClient: TunnelClient | null = null;
  if (config.relay.url && config.relay.token) {
    tunnelClient = new TunnelClient(config.relay.url, config.relay.token, config.port);
    setupTunnelBridge(tunnelClient, manager, metaAgent);
    tunnelClient.start();
    console.log(`[Server] Tunnel client connecting to ${config.relay.url}`);
  }

  return { app, httpServer, io, store, manager, metaAgent, cleanupInterval, tunnelClient };
}

// Only start server if this is the main module
const isMain = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMain) {
  const { httpServer } = createApp();
  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`Agent Monitor server running on port ${config.port}`);
  });
}
