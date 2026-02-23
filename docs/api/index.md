# REST API Reference

All API endpoints are served at `http://localhost:3456/api/`.

## Base URL

```
http://localhost:3456/api
```

## Authentication

No authentication is required (local development tool).

## Response Format

All responses are JSON. Errors return:

```json
{
  "error": "Error description"
}
```

## Endpoints

### Agents
- [Agent endpoints](/api/agents) - Create, manage, and interact with agents

### Pipeline Tasks
- [Task endpoints](/api/tasks) - Manage pipeline tasks and meta agent

### Templates
- [Template endpoints](/api/templates) - CRUD operations for CLAUDE.md templates

### Other
- `GET /api/sessions` - List Claude Code sessions
- `GET /api/directories?path=/path` - Browse server filesystem directories
