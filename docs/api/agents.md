# Agents API

## List Agents

```
GET /api/agents
```

Returns an array of all agents.

## Get Agent

```
GET /api/agents/:id
```

Returns a single agent with full message history.

## Create Agent

```
POST /api/agents
```

**Body:**
```json
{
  "name": "my-agent",
  "provider": "claude",
  "directory": "/path/to/project",
  "prompt": "What should the agent do?",
  "claudeMd": "Optional CLAUDE.md content",
  "adminEmail": "admin@example.com",
  "flags": {
    "dangerouslySkipPermissions": true,
    "model": "claude-sonnet-4-20250514"
  }
}
```

## Stop Agent

```
POST /api/agents/:id/stop
```

## Stop All Agents

```
POST /api/agents/actions/stop-all
```

## Delete Agent

```
DELETE /api/agents/:id
```

## Send Message

```
POST /api/agents/:id/message
```

**Body:**
```json
{
  "text": "Your message to the agent"
}
```

## Interrupt Agent

```
POST /api/agents/:id/interrupt
```

Sends SIGINT to the agent process (equivalent to double-Esc).

## Rename Agent

```
PUT /api/agents/:id/rename
```

**Body:**
```json
{
  "name": "new-agent-name"
}
```

## Update CLAUDE.md

```
PUT /api/agents/:id/claude-md
```

**Body:**
```json
{
  "content": "Updated CLAUDE.md content"
}
```
