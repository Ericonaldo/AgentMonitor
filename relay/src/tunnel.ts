import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { relayConfig } from './config.js';

export type TunnelMessage = Record<string, unknown> & { type: string };

export type HttpRequest = TunnelMessage & {
  type: 'http:request';
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
};

export type HttpResponse = TunnelMessage & {
  type: 'http:response';
  id: string;
  status: number;
  headers: Record<string, string>;
  body: string | null;
};

type PendingRequest = {
  resolve: (res: HttpResponse) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class TunnelManager {
  private wss: WebSocketServer;
  private tunnel: WebSocket | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private messageHandler: ((msg: TunnelMessage) => void) | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(httpServer: HttpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/tunnel' });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  get connected(): boolean {
    return this.tunnel !== null && this.tunnel.readyState === WebSocket.OPEN;
  }

  get startTime(): number {
    return this._startTime;
  }

  private _startTime = Date.now();

  onMessage(handler: (msg: TunnelMessage) => void): void {
    this.messageHandler = handler;
  }

  send(msg: TunnelMessage): void {
    if (this.tunnel && this.tunnel.readyState === WebSocket.OPEN) {
      this.tunnel.send(JSON.stringify(msg));
    }
  }

  sendHttpRequest(req: HttpRequest): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        resolve({
          type: 'http:response',
          id: req.id,
          status: 502,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Tunnel not connected' }),
        });
        return;
      }

      const timer = setTimeout(() => {
        this.pendingRequests.delete(req.id);
        resolve({
          type: 'http:response',
          id: req.id,
          status: 504,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Tunnel request timeout' }),
        });
      }, 30_000);

      this.pendingRequests.set(req.id, { resolve, timer });
      this.send(req);
    });
  }

  private handleConnection(ws: WebSocket, _req: import('http').IncomingMessage): void {
    // Require auth as first message
    const authTimeout = setTimeout(() => {
      ws.close(4001, 'Auth timeout');
    }, 5_000);

    ws.once('message', (data) => {
      clearTimeout(authTimeout);
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type !== 'auth' || msg.token !== relayConfig.token) {
          ws.send(JSON.stringify({ type: 'auth:error', message: 'Invalid token' }));
          ws.close(4003, 'Invalid token');
          return;
        }

        // Auth success - replace any existing tunnel
        if (this.tunnel && this.tunnel.readyState === WebSocket.OPEN) {
          console.log('[Relay] Replacing existing tunnel connection');
          this.tunnel.close(1000, 'Replaced by new connection');
        }

        this.tunnel = ws;
        ws.send(JSON.stringify({ type: 'auth:ok' }));
        console.log('[Relay] Tunnel connected');

        // Start keepalive pings
        this.startPing(ws);

        ws.on('message', (rawData) => this.handleMessage(rawData));
        ws.on('close', () => this.handleDisconnect(ws));
        ws.on('error', (err) => {
          console.error('[Relay] Tunnel error:', err.message);
          this.handleDisconnect(ws);
        });
      } catch {
        ws.close(4002, 'Invalid auth message');
      }
    });
  }

  private handleMessage(data: import('ws').RawData): void {
    try {
      const msg: TunnelMessage = JSON.parse(data.toString());

      if (msg.type === 'pong') {
        return; // Keepalive response
      }

      if (msg.type === 'http:response') {
        const pending = this.pendingRequests.get(msg.id as string);
        if (pending) {
          clearTimeout(pending.timer);
          this.pendingRequests.delete(msg.id as string);
          pending.resolve(msg as unknown as HttpResponse);
        }
        return;
      }

      // Forward all other messages (socket:s2c, etc) to handler
      if (this.messageHandler) {
        this.messageHandler(msg);
      }
    } catch (err) {
      console.error('[Relay] Failed to parse tunnel message:', err);
    }
  }

  private handleDisconnect(ws: WebSocket): void {
    if (this.tunnel === ws) {
      this.tunnel = null;
      console.log('[Relay] Tunnel disconnected');
      this.stopPing();

      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.resolve({
          type: 'http:response',
          id,
          status: 502,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'Tunnel disconnected' }),
        });
      }
      this.pendingRequests.clear();
    }
  }

  private startPing(ws: WebSocket): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', ts: Date.now() });
      }
    }, 30_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  close(): void {
    this.stopPing();
    if (this.tunnel) {
      this.tunnel.close();
      this.tunnel = null;
    }
    this.wss.close();
  }
}
