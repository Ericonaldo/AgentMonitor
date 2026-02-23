# Agent Monitor

A web-based monitoring and management system for AI coding agents. Supports **Claude Code** and **OpenAI Codex** CLI agents.

## Features

- **Multi-provider support**: Create and manage both Claude Code and Codex agents from a single dashboard
- **Real-time streaming**: Watch agent output in real-time via WebSocket
- **Dashboard**: Card-based overview of all agents with status, last message, and cost/token tracking
- **ChatGPT-like interface**: Send messages, view conversation history, use slash commands
- **Git worktree isolation**: Each agent runs in its own git worktree branch to avoid conflicts
- **CLAUDE.md management**: Create templates, load them into agents, edit per-agent CLAUDE.md live
- **Directory browser**: Browse server directories to select working directories
- **Session resume**: Resume previous Claude Code sessions
- **Email notifications**: Get notified when an agent needs human interaction
- **Double-Esc interrupt**: Press Escape twice to send SIGINT to the agent
- **Slash commands**: `/help`, `/clear`, `/status`, `/cost`, `/stop`

## Architecture

```
AgentMonitor/
  package.json              # Monorepo root
  server/                   # Node.js + Express + Socket.IO + TypeScript
    src/
      index.ts              # HTTP server entry point (port 3456)
      config.ts             # Environment configuration
      models/               # TypeScript interfaces
      store/AgentStore.ts   # JSON file persistence
      services/
        AgentProcess.ts     # Wraps claude/codex CLI process
        AgentManager.ts     # Agent lifecycle management
        WorktreeManager.ts  # Git worktree operations
        SessionReader.ts    # Read ~/.claude/projects/ sessions
        EmailNotifier.ts    # nodemailer integration
        DirectoryBrowser.ts # Server directory listing
      routes/               # REST API endpoints
      socket/handlers.ts    # WebSocket event handlers
    __tests__/              # 22 backend tests
  client/                   # React + Vite + TypeScript
    src/
      pages/
        Dashboard.tsx       # Agent card grid
        CreateAgent.tsx     # Creation wizard
        AgentChat.tsx       # Chat interface
        Templates.tsx       # Template management
      api/
        client.ts           # REST API client
        socket.ts           # Socket.IO client
```

## Prerequisites

- **Node.js** >= 18
- **Claude Code CLI** (`claude`) - for Claude agents
- **Codex CLI** (`codex`) - for Codex agents
- **Git** - for worktree isolation

## Quick Start

```bash
# Install dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# Build the frontend
cd client && npx vite build && cd ..

# Start the server (serves both API and frontend)
cd server && npx tsx src/index.ts
```

Open http://localhost:3456 in your browser.

### Development Mode

```bash
npm run dev    # Starts both server (tsx watch) and client (vite dev) concurrently
```

- Client dev server: http://localhost:5173 (proxies API to :3456)
- API server: http://localhost:3456

## Usage Guide

### Creating an Agent

1. Click **"+ New Agent"** on the Dashboard or navigate to **New Agent**
2. **Select Provider**: Choose between **Claude Code** or **Codex**
3. **Name**: Give the agent a descriptive name
4. **Working Directory**: Type a path or click **Browse** to navigate the server filesystem
5. **Prompt**: Describe what the agent should do
6. **Model** (optional): Specify a model (e.g., `claude-sonnet-4-5-20250514` or `o3`)
7. **Flags**:
   - Claude: `--dangerously-skip-permissions`
   - Codex: `--dangerously-bypass-approvals-and-sandbox`, `--full-auto`
8. **Resume Session** (Claude only): Pick a previous session to continue
9. **CLAUDE.md**: Write custom instructions or load from a template
10. **Admin Email**: Optional email for notifications when the agent needs input
11. Click **Create Agent**

### Dashboard

The dashboard shows all agents as cards:

- **Status badge**: running (green), stopped (gray), error (red), waiting_input (yellow)
- **Provider badge**: CLAUDE (orange) or CODEX (green)
- **Last message**: Preview of the most recent agent output
- **Actions**: Stop individual agents, Delete agents, or Stop All

Click a card to enter the agent's chat view.

### Agent Chat

The chat view provides a full conversation interface:

- **Message history**: See all agent messages (assistant, tool, system)
- **Send messages**: Type in the input box and press Enter
- **Double-Esc**: Press Escape twice quickly to interrupt the agent (sends SIGINT)
- **Slash commands**: Type `/` to see available commands
  - `/help` - Show available commands
  - `/clear` - Clear chat display
  - `/status` - Refresh agent status
  - `/cost` - Show current cost
  - `/stop` - Stop the agent
- **Edit CLAUDE.md**: Click the button to modify the agent's instructions live
- **Cost/Token tracking**: See cost (Claude) or token usage (Codex) in the header

### Templates

Navigate to **Templates** to manage CLAUDE.md templates:

- **Create**: Write reusable instruction sets
- **Edit**: Modify existing templates
- **Delete**: Remove templates
- **Load into agents**: When creating an agent, select a template from the dropdown

## API Reference

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get agent details |
| POST | `/api/agents` | Create agent |
| POST | `/api/agents/:id/stop` | Stop agent |
| POST | `/api/agents/:id/message` | Send message to agent |
| POST | `/api/agents/:id/interrupt` | Interrupt agent (SIGINT) |
| PUT | `/api/agents/:id/claude-md` | Update agent's CLAUDE.md |
| DELETE | `/api/agents/:id` | Delete agent |
| POST | `/api/agents/actions/stop-all` | Stop all agents |

#### Create Agent Request Body

```json
{
  "name": "my-agent",
  "provider": "claude",
  "directory": "/path/to/project",
  "prompt": "Fix the login bug",
  "claudeMd": "# Instructions\nWrite tests.",
  "adminEmail": "admin@example.com",
  "flags": {
    "dangerouslySkipPermissions": true,
    "model": "claude-sonnet-4-5-20250514",
    "resume": "session-id",
    "fullAuto": false
  }
}
```

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all templates |
| GET | `/api/templates/:id` | Get template |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |

### Other

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List previous Claude sessions |
| GET | `/api/directories?path=/home` | Browse server directories |
| GET | `/api/health` | Health check |

### Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `agent:join` | Client -> Server | Subscribe to agent messages |
| `agent:leave` | Client -> Server | Unsubscribe |
| `agent:send` | Client -> Server | Send message `{agentId, text}` |
| `agent:interrupt` | Client -> Server | Send interrupt |
| `agent:message` | Server -> Client | Agent output `{agentId, message}` |
| `agent:status` | Server -> Client | Status change `{agentId, status}` |

## Provider Details

### Claude Code

- Binary: `claude` (or set `CLAUDE_BIN` env var)
- Runs: `claude -p <prompt> --output-format stream-json`
- Supports: `--dangerously-skip-permissions`, `--resume`, `--model`
- Stream format: NDJSON with `type`/`subtype` fields
- Tracks: cost in USD

### Codex

- Binary: `codex` (or set `CODEX_BIN` env var)
- Runs: `codex exec --json <prompt>`
- Supports: `--dangerously-bypass-approvals-and-sandbox`, `--full-auto`, `--model`, `--cd`, `--skip-git-repo-check`
- Stream format: NDJSON events (`thread.started`, `turn.started`, `item.completed`, `turn.completed`)
- Tracks: token usage (input/output)

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | Server port |
| `CLAUDE_BIN` | `claude` | Path to Claude CLI |
| `CODEX_BIN` | `codex` | Path to Codex CLI |
| `SMTP_HOST` | | SMTP server host |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_SECURE` | `false` | Use TLS |
| `SMTP_USER` | | SMTP username |
| `SMTP_PASS` | | SMTP password |
| `SMTP_FROM` | `agent-monitor@localhost` | From address |

## Testing

```bash
npm test          # Run server tests (22 tests)
npm run test:client  # Run client tests
```

## License

MIT
