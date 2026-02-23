# Agent Chat

The chat interface provides a web-based terminal for interacting with individual agents, similar to using Claude Code or Codex in a terminal.

## Features

- **Real-time message streaming**: See agent responses as they arrive
- **Slash commands**: 25 commands matching Claude Code CLI (see [Slash Commands](/guide/slash-commands))
- **CLAUDE.md editor**: Edit agent instructions mid-session
- **Double Esc interrupt**: Press Escape twice quickly to interrupt a running agent
- **Cost tracking**: Live cost and token usage in the header

## Chat Header

The header shows:
- Provider badge and agent name
- Working directory and cost summary
- Status indicator with color coding
- Edit CLAUDE.md button
- Stop button (when agent is running)

## Message Types

Messages are color-coded by role:
- **User messages**: Your input to the agent
- **Assistant messages**: Agent responses (highlighted)
- **Tool messages**: Tool usage indicators
- **System messages**: Local command output (from slash commands)
