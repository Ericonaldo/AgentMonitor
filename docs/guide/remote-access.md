# Remote Access (Relay Mode)

Agent Monitor runs on the machine where your agents execute (the **agent machine**). Since this machine is often not publicly accessible, a **relay server** on a public machine forwards all traffic through a WebSocket tunnel.

```
Phone / Laptop ──HTTP──▶ Public Server (Relay :3457) ◀──WS tunnel──  Agent Machine (:3456)
```

## Architecture Overview

| Component | Where it runs | What it does |
|-----------|---------------|--------------|
| **AgentMonitor server** | Agent machine (local) | Manages agents, spawns CLI processes |
| **Relay server** | Public server | Serves dashboard, forwards API + Socket.IO via tunnel |
| **TunnelClient** | Agent machine (local) | Connects outbound to relay, handles forwarded requests |
| **Dashboard** | Browser (any device) | Accesses relay URL — identical to local mode |

The tunnel is **outbound-only** from the agent machine — no inbound ports needed.

---

## Quick Start

### 1. Deploy the relay to a public server

```bash
# From the AgentMonitor repo on any machine with SSH access:
bash relay/scripts/deploy.sh <your-secret-token>
```

This builds the client + relay, rsyncs to the server, installs deps, and starts with pm2.

### 2. Start AgentMonitor with tunnel enabled

```bash
RELAY_URL=ws://<public-ip>:3457/tunnel \
RELAY_TOKEN=<your-secret-token> \
npx tsx server/src/index.ts
```

You'll see:
```
[Tunnel] Connecting to ws://<public-ip>:3457/tunnel...
[Tunnel] Connected, authenticating...
[Tunnel] Authenticated successfully
Agent Monitor server running on port 3456
```

### 3. Open the dashboard from any device

Navigate to `http://<public-ip>:3457` in any browser.

---

## Switching Agent Machines

You can run AgentMonitor on **any machine** — a desktop, a cloud VM, a lab server — as long as it can reach the relay. The relay doesn't care which machine connects; it just forwards traffic to whoever is currently tunneled in.

### What you need on the new machine

1. **Clone the repo** and install dependencies:
   ```bash
   git clone <repo-url> && cd AgentMonitor
   npm install
   cd server && npm install
   ```

2. **Install agent CLIs** that you plan to use:
   ```bash
   # Claude Code
   npm install -g @anthropic-ai/claude-code

   # Codex (optional)
   npm install -g @openai/codex
   ```

3. **Copy your `.env` file** (or set environment variables):
   ```bash
   # Required for relay mode:
   RELAY_URL=ws://<public-ip>:3457/tunnel
   RELAY_TOKEN=<same-token-as-relay>

   # Optional (same as before):
   # SMTP_*, TWILIO_*, SLACK_WEBHOOK_URL, CLAUDE_BIN, CODEX_BIN
   ```

4. **Start the server**:
   ```bash
   cd server && npx tsx src/index.ts
   ```

That's it. The relay automatically accepts the new tunnel connection (replacing any previous one). The dashboard at `http://<public-ip>:3457` now talks to the new machine.

### Important notes

- **One agent machine at a time.** The relay accepts one tunnel connection. If a new machine connects, it replaces the old one.
- **Agent data is local.** Each machine has its own `server/data/` directory with agent history, templates, and settings. These do not sync between machines.
- **Sessions are local.** Claude Code sessions (for `--resume`) live on the machine where they were created.
- **Git repos must exist locally.** The working directory you specify when creating an agent must exist on the agent machine.

### Migrating agent data between machines

If you want to preserve agents, templates, and settings:

```bash
# On the old machine:
rsync -avz server/data/ new-machine:/path/to/AgentMonitor/server/data/
```

---

## Relay Server Management

### Check relay status

```bash
curl http://<public-ip>:3457/api/relay/status
# {"tunnelConnected":true,"uptime":3600}
```

### View relay logs

```bash
ssh your-server "pm2 logs agentmonitor-relay --lines 20"
```

### Restart the relay

```bash
ssh your-server "pm2 restart agentmonitor-relay"
```

### Redeploy after code changes

```bash
bash relay/scripts/deploy.sh <your-token>
```

### Change the relay token

1. Stop the relay: `ssh your-server "pm2 delete agentmonitor-relay"`
2. Redeploy with new token: `bash relay/scripts/deploy.sh <new-token>`
3. Update `RELAY_TOKEN` on the agent machine and restart

---

## Configuration Reference

### Agent machine environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RELAY_URL` | Yes | WebSocket URL of relay (e.g., `ws://1.2.3.4:3457/tunnel`) |
| `RELAY_TOKEN` | Yes | Shared secret — must match relay |
| `PORT` | No | Local server port (default: `3456`) |

### Relay server environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RELAY_TOKEN` | Yes | Shared secret — must match agent machine |
| `RELAY_PORT` | No | Port relay listens on (default: `3457`) |
| `RELAY_DOMAIN` | No | Domain name if using nginx reverse proxy |

### Local-only mode

When `RELAY_URL` is **not set**, the server runs in local-only mode with zero relay overhead. Access the dashboard at `http://localhost:3456` directly.

---

## Tunnel Behavior

| Scenario | What happens |
|----------|--------------|
| Agent machine starts | Tunnel connects and authenticates automatically |
| Tunnel drops | Auto-reconnects with exponential backoff (5s → 60s) |
| Agent machine restarts | Tunnel reconnects; relay resumes forwarding |
| Relay restarts | Agent machine detects disconnect, reconnects when relay is back |
| Wrong token | Auth rejected, tunnel client stops (no retry) |
| API call while tunnel is down | Relay returns `502 Tunnel not connected` |

---

## Security Considerations

- The tunnel uses a **shared token** for authentication. Use a strong random token.
- The relay port is **open to the internet**. Consider using a firewall or nginx with HTTPS.
- Dashboard access is **unauthenticated**. For production use, put nginx with basic auth or a VPN in front.

### Adding nginx + HTTPS (optional)

```nginx
server {
    listen 443 ssl;
    server_name monitor.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3457;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Set `RELAY_DOMAIN=monitor.yourdomain.com` to have the relay log the domain name on startup.
