# Pipeline Tasks API

## List Tasks

```
GET /api/tasks
```

## Get Task

```
GET /api/tasks/:id
```

## Create Task

```
POST /api/tasks
```

**Body:**
```json
{
  "name": "Create login page",
  "prompt": "Build a login page with email and password fields",
  "directory": "/path/to/project",
  "provider": "claude",
  "model": "claude-sonnet-4-20250514",
  "claudeMd": "Custom instructions...",
  "flags": {},
  "order": 0
}
```

## Update Task

```
PUT /api/tasks/:id
```

## Delete Task

```
DELETE /api/tasks/:id
```

## Reset Task

```
POST /api/tasks/:id/reset
```

Resets a failed or completed task back to pending.

## Clear Completed Tasks

```
POST /api/tasks/actions/clear-completed
```

## Meta Agent Manager

### Get Config

```
GET /api/tasks/meta/config
```

### Update Config

```
PUT /api/tasks/meta/config
```

**Body:**
```json
{
  "defaultDirectory": "/path/to/project",
  "defaultProvider": "claude",
  "pollIntervalMs": 5000,
  "claudeMd": "Default CLAUDE.md for managed agents"
}
```

### Start Manager

```
POST /api/tasks/meta/start
```

### Stop Manager

```
POST /api/tasks/meta/stop
```

### Get Status

```
GET /api/tasks/meta/status
```
