# Configuration

## Server Configuration

The server runs on port `3456` by default. Set the `PORT` environment variable to change it.

```bash
PORT=8080 npm start
```

## Agent Flags

When creating an agent, you can configure these flags:

### Claude Code Flags
- **dangerouslySkipPermissions**: Skip all permission prompts (for sandboxed environments)
- **chrome**: Enable Chrome browser integration
- **model**: Specify model (e.g., `claude-sonnet-4-20250514`)

### Codex Flags
- **dangerouslySkipPermissions**: Auto-approve all operations
- **model**: Specify model (e.g., `o4-mini`)

## CLAUDE.md

Each agent can have custom instructions via CLAUDE.md content. You can:
1. Write inline content when creating the agent
2. Load from saved templates
3. Edit at any time via the chat interface (`/memory` command or Edit CLAUDE.md button)

## Git Worktree Isolation

Each agent runs in an isolated git worktree to prevent conflicts when multiple agents work in the same repository. Worktrees are created automatically under `.agent-worktrees/` in the target directory.

## Notifications

Set an admin email or WhatsApp phone number when creating an agent to receive notifications when the agent needs human interaction. See the [Notifications](./notifications.md) guide for full setup details.
