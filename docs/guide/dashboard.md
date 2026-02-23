# Dashboard

The dashboard provides a real-time overview of all your AI coding agents.

## Agent Cards

Each agent is displayed as a card showing:
- **Provider badge**: CLAUDE (purple) or CODEX (green)
- **Agent name**: Click to enter chat view
- **Status indicator**: Running (green), Stopped (gray), Error (red), Waiting Input (yellow)
- **Cost**: Total API cost in USD
- **Token usage**: Input + output tokens
- **Latest message**: Preview of the most recent agent response
- **Working directory**: Path where the agent operates

## Actions

- **+ New Agent**: Navigate to the agent creation form
- **Stop All**: Stop all running agents at once
- **Delete**: Remove a stopped agent (click the X button)

## Real-time Updates

The dashboard uses Socket.IO for live updates. Agent status changes, new messages, and cost updates appear instantly without refreshing the page.
