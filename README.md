# Agent Monitor

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-40%20passing-22c55e?style=for-the-badge)](server/__tests__)
[![i18n](https://img.shields.io/badge/i18n-EN%20%7C%20%E4%B8%AD%E6%96%87-6366f1?style=for-the-badge)](#internationalization)

A web-based monitoring and management system for AI coding agents. Supports **Claude Code** and **OpenAI Codex** CLI agents.

## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Task Pipeline
![Pipeline](docs/screenshots/pipeline.png)

### Create Agent
![Create Agent](docs/screenshots/create-agent.png)

### Templates
![Templates](docs/screenshots/templates.png)

### Chinese Language Support
![Dashboard (Chinese)](docs/screenshots/dashboard-zh.png)

## Features

- **Multi-provider support**: Create and manage both Claude Code and Codex agents from a single dashboard
- **Real-time streaming**: Watch agent output in real-time via WebSocket
- **Dashboard**: Card-based overview of all agents with status, last message, and cost/token tracking
- **Web terminal interface**: Send messages, view conversation history, use slash commands matching CLI behavior
- **Task Pipeline**: Sequential and parallel task orchestration with a meta agent manager
- **Git worktree isolation**: Each agent runs in its own git worktree branch to avoid conflicts
- **CLAUDE.md management**: Create templates, load them into agents, edit per-agent CLAUDE.md live
- **Directory browser**: Browse server directories to select working directories
- **Session resume**: Resume previous Claude Code sessions
- **Email notifications**: Get notified when an agent needs human interaction
- **Double-Esc interrupt**: Press Escape twice to send SIGINT to the agent
- **Slash commands**: `/help`, `/clear`, `/status`, `/cost`, `/stop`, `/compact`, `/model`, `/export`
- **Internationalization**: Full Chinese/English support with one-click language toggle

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
        MetaAgentManager.ts # Pipeline task orchestration
        WorktreeManager.ts  # Git worktree operations
        SessionReader.ts    # Read ~/.claude/projects/ sessions
        EmailNotifier.ts    # nodemailer integration
        DirectoryBrowser.ts # Server directory listing
      routes/               # REST API endpoints
      socket/handlers.ts    # WebSocket event handlers
    __tests__/              # 40 backend tests
  client/                   # React + Vite + TypeScript
    src/
      i18n/                 # Internationalization (EN/ZH)
        translations.ts     # Translation dictionaries
        LanguageContext.tsx  # React context + useTranslation hook
      pages/
        Dashboard.tsx       # Agent card grid
        CreateAgent.tsx     # Creation wizard
        AgentChat.tsx       # Chat interface
        Templates.tsx       # Template management
        Pipeline.tsx        # Task pipeline UI
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
  - `/compact` - Compact conversation
  - `/model` - Show/change model
  - `/export` - Export conversation
- **Edit CLAUDE.md**: Click the button to modify the agent's instructions live
- **Cost/Token tracking**: See cost (Claude) or token usage (Codex) in the header

### Task Pipeline

The pipeline page enables task orchestration:

- **Sequential tasks**: Tasks run one after another (different step orders)
- **Parallel tasks**: Tasks with the same step order run simultaneously
- **Meta Agent Manager**: Automated agent that picks up tasks from the queue
- **Configure**: Set default working directory, provider, and CLAUDE.md for managed agents

### Templates

Navigate to **Templates** to manage CLAUDE.md templates:

- **Create**: Write reusable instruction sets
- **Edit**: Modify existing templates
- **Delete**: Remove templates
- **Load into agents**: When creating an agent, select a template from the dropdown

### Internationalization

Agent Monitor supports **English** and **Chinese** with a language toggle in the navigation bar.

- Click **"中文"** to switch to Chinese
- Click **"EN"** to switch back to English
- Language preference is saved in localStorage and persists across sessions

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

### Pipeline Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all pipeline tasks |
| POST | `/api/tasks` | Create a pipeline task |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST | `/api/tasks/:id/reset` | Reset task status |
| POST | `/api/tasks/clear-completed` | Clear completed/failed tasks |
| GET | `/api/meta/config` | Get meta agent config |
| PUT | `/api/meta/config` | Update meta agent config |
| POST | `/api/meta/start` | Start meta agent manager |
| POST | `/api/meta/stop` | Stop meta agent manager |

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
| `task:update` | Server -> Client | Pipeline task updated |
| `pipeline:complete` | Server -> Client | All pipeline tasks complete |
| `meta:status` | Server -> Client | Meta agent status change |

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
npm test          # Run all tests (40 tests)
```

## License

MIT
