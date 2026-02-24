import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import type { TunnelManager } from './tunnel.js';

/**
 * Express middleware that forwards /api/* requests through the tunnel
 * to the local AgentMonitor server.
 */
export function createHttpProxy(tunnelManager: TunnelManager) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Don't proxy relay-local endpoints
    if (req.path === '/api/relay/status') {
      next();
      return;
    }

    const id = randomUUID();
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? JSON.stringify(req.body)
      : null;

    try {
      const tunnelRes = await tunnelManager.sendHttpRequest({
        type: 'http:request',
        id,
        method: req.method,
        path: req.originalUrl,
        headers: {
          'content-type': req.headers['content-type'] || 'application/json',
          ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        },
        body,
      });

      // Set response headers
      for (const [key, value] of Object.entries(tunnelRes.headers || {})) {
        res.setHeader(key, value);
      }

      res.status(tunnelRes.status);
      if (tunnelRes.body !== null && tunnelRes.body !== undefined) {
        res.send(tunnelRes.body);
      } else {
        res.end();
      }
    } catch (err) {
      res.status(502).json({ error: 'Tunnel proxy error', detail: String(err) });
    }
  };
}
