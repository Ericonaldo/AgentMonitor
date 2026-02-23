# Slash Commands

The Agent Chat interface supports 25 slash commands, matching Claude Code CLI interactive behavior. Type `/` in the input field to see the autocomplete menu.

## Available Commands

| Command | Description |
|---------|-------------|
| `/agents` | List all managed agents with status and cost |
| `/clear` | Clear conversation history |
| `/compact` | Compact conversation (supports `/compact [instructions]`) |
| `/config` | Show agent configuration (provider, directory, flags) |
| `/context` | Show context window usage with visual progress bar |
| `/copy` | Copy last assistant response to clipboard |
| `/cost` | Show token usage and cost statistics |
| `/doctor` | Check agent and server health |
| `/exit` | Return to the dashboard |
| `/export` | Export conversation to a text file |
| `/help` | Show all available commands |
| `/memory` | Open CLAUDE.md editor modal |
| `/model` | Show current model |
| `/permissions` | Show agent permission flags |
| `/plan` | Send plan mode command to the agent |
| `/plugin` | Information about plugin management |
| `/rename` | Rename the current agent |
| `/skills` | List all available slash commands |
| `/stats` | Show usage statistics (messages, chars, duration, cost) |
| `/status` | Show full agent status info |
| `/stop` | Stop the agent |
| `/tasks` | Show pipeline tasks with status |
| `/theme` | Toggle dark/light theme |
| `/todos` | List TODO/FIXME items from conversation |
| `/usage` | Show usage limits and rate info |

## Keyboard Shortcuts

- **Enter** or **Tab**: Select highlighted command
- **Arrow Up/Down**: Navigate command list
- **Double Esc**: Interrupt the running agent
- **Enter** (without `/`): Send message to agent
