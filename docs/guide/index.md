# Quick Start

## Prerequisites

- Node.js 18+
- Claude Code CLI (`claude`) or OpenAI Codex CLI (`codex`)
- Git (for worktree isolation)

## Installation

```bash
git clone <repo-url> && cd AgentMonitor
npm install
```

## Running

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build
npm start
```

The server starts on `http://localhost:3456`.

## Creating Your First Agent

1. Navigate to **New Agent** in the nav bar
2. Enter a name, working directory, and prompt
3. Select provider (Claude Code or Codex)
4. Configure flags (e.g., `--dangerously-skip-permissions`)
5. Click **Create Agent**

The agent will start in an isolated git worktree and begin executing your prompt.

## Using the Dashboard

The dashboard shows all active agents as cards with:
- Provider badge (CLAUDE / CODEX)
- Current status (running, stopped, error, waiting_input)
- Cost and token usage
- Latest message preview

Click any card to enter the full chat interface.
