# Configuration

## Environment Variables

All configuration is done through environment variables. Copy `.env.example` to `.env` and fill in the values you need. All variables are optional — Agent Monitor works with sensible defaults.

### Server

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3456` | Port the server listens on |
| `CLAUDE_BIN` | `claude` | Path to the Claude Code CLI binary |
| `CODEX_BIN` | `codex` | Path to the Codex CLI binary |

```bash
PORT=8080 npm start
```

### Email Notifications (SMTP)

| Variable | Default | Description |
|---|---|---|
| `SMTP_HOST` | _(none)_ | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_SECURE` | `false` | `true` for port 465 (TLS), `false` for port 587 (STARTTLS) |
| `SMTP_USER` | _(none)_ | SMTP authentication username |
| `SMTP_PASS` | _(none)_ | SMTP authentication password |
| `SMTP_FROM` | `agent-monitor@localhost` | "From" address in notification emails |

See the [Notifications](./notifications.md) guide for detailed setup instructions.

### WhatsApp Notifications (Twilio)

| Variable | Default | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | _(none)_ | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | _(none)_ | Twilio Auth Token |
| `TWILIO_WHATSAPP_FROM` | _(none)_ | WhatsApp-enabled Twilio phone number |

See the [Notifications](./notifications.md) guide for detailed setup instructions.

### Slack Notifications (Webhook)

| Variable | Default | Description |
|---|---|---|
| `SLACK_WEBHOOK_URL` | _(none)_ | Slack Incoming Webhook URL |

See the [Notifications](./notifications.md) guide for detailed setup instructions.

### Remote Relay

| Variable | Default | Description |
|---|---|---|
| `RELAY_URL` | _(none)_ | WebSocket URL of the relay server (e.g., `ws://1.2.3.4:3457/tunnel`) |
| `RELAY_TOKEN` | _(none)_ | Shared secret for tunnel authentication |

When `RELAY_URL` is not set, relay mode is disabled (local-only). See the [Remote Access](./remote-access.md) guide for full setup.

## Agent Flags

When creating an agent, you can configure these flags:

### Claude Code Flags
- **dangerouslySkipPermissions**: Skip all permission prompts (for sandboxed environments)
- **chrome**: Enable Chrome browser integration
- **permissionMode**: Permission mode (`default`, `acceptEdits`, `bypassPermissions`, `dontAsk`, `plan`)
- **maxBudgetUsd**: Maximum dollar amount to spend on API calls
- **allowedTools**: Comma/space-separated list of allowed tools (e.g., `Bash(git:*) Edit Read`)
- **disallowedTools**: Comma/space-separated list of denied tools (e.g., `Bash(rm:*) Write`)
- **addDirs**: Additional directories to allow tool access to (comma-separated)
- **mcpConfig**: Path to MCP server config JSON file
- **model**: Specify model (e.g., `claude-sonnet-4-6`)

### Codex Flags
- **dangerouslySkipPermissions**: Auto-approve all operations
- **fullAuto**: Enable full-auto mode
- **model**: Specify model (e.g., `o4-mini`)

## CLAUDE.md

Each agent can have custom instructions via CLAUDE.md content. You can:
1. Write inline content when creating the agent
2. Load from saved templates
3. Edit at any time via the chat interface (`/memory` command or Edit CLAUDE.md button)

## Git Worktree Isolation

Each agent runs in an isolated git worktree to prevent conflicts when multiple agents work in the same repository. Worktrees are created automatically under `.agent-worktrees/` in the target directory.

## Notifications

Set an admin email, WhatsApp phone number, or Slack webhook URL when creating an agent to receive notifications when the agent needs human interaction. See the [Notifications](./notifications.md) guide for full setup details.
