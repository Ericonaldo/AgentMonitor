import WebSocket from 'ws';
import { config } from '../config.js';

export interface TunnelMessage {
  type: string;
  [key: string]: unknown;
}

export interface HttpRequestMsg {
  type: 'http:request';
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
}

/**
 * Outbound tunnel client that connects from the local machine to the relay server.
 * Handles auth, HTTP request forwarding, and reconnection with exponential backoff.
 */
export class TunnelClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 5_000;
  private maxReconnectDelay = 60_000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private messageHandler: ((msg: TunnelMessage) => void) | null = null;
  private closed = false;

  constructor(
    private relayUrl: string,
    private token: string,
    private localPort: number = config.port,
  ) {}

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  onMessage(handler: (msg: TunnelMessage) => void): void {
    this.messageHandler = handler;
  }

  send(msg: TunnelMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  start(): void {
    this.closed = false;
    this.connect();
  }

  close(): void {
    this.closed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private connect(): void {
    if (this.closed) return;

    console.log(`[Tunnel] Connecting to ${this.relayUrl}...`);
    try {
      this.ws = new WebSocket(this.relayUrl);
    } catch (err) {
      console.error('[Tunnel] Failed to create WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log('[Tunnel] Connected, authenticating...');
      this.send({ type: 'auth', token: this.token });
    });

    this.ws.on('message', (data) => {
      try {
        const msg: TunnelMessage = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch (err) {
        console.error('[Tunnel] Failed to parse message:', err);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log(`[Tunnel] Disconnected (code=${code}, reason=${reason?.toString() || ''})`);
      this.ws = null;
      this.stopPing();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[Tunnel] WebSocket error:', err.message);
      // 'close' event will follow and trigger reconnect
    });
  }

  private handleMessage(msg: TunnelMessage): void {
    switch (msg.type) {
      case 'auth:ok':
        console.log('[Tunnel] Authenticated successfully');
        this.reconnectDelay = 5_000; // Reset backoff on success
        this.startPing();
        break;

      case 'auth:error':
        console.error('[Tunnel] Auth failed:', msg.message);
        this.close(); // Don't reconnect on auth failure
        break;

      case 'ping':
        this.send({ type: 'pong', ts: msg.ts });
        break;

      case 'http:request':
        this.handleHttpRequest(msg as unknown as HttpRequestMsg);
        break;

      default:
        // Forward to message handler (socket:c2s events, etc)
        if (this.messageHandler) {
          this.messageHandler(msg);
        }
        break;
    }
  }

  private async handleHttpRequest(req: HttpRequestMsg): Promise<void> {
    const url = `http://127.0.0.1:${this.localPort}${req.path}`;
    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: req.headers,
      };
      if (req.body !== null && req.method !== 'GET' && req.method !== 'HEAD') {
        fetchOptions.body = req.body;
      }

      const response = await fetch(url, fetchOptions);
      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      this.send({
        type: 'http:response',
        id: req.id,
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
      });
    } catch (err) {
      this.send({
        type: 'http:response',
        id: req.id,
        status: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Local server unreachable', detail: String(err) }),
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    console.log(`[Tunnel] Reconnecting in ${this.reconnectDelay / 1000}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectDelay);
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.connected) {
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
}
