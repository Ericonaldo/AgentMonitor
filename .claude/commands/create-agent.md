# Create Agent via API

Create a new Claude Code or Codex agent via the Agent Monitor API.

Required argument: A description of what the agent should do.

## Steps

1. Ensure Agent Monitor is running on port 3456
2. Create the agent via REST API
3. Report the agent ID and URL

## Example

```bash
# Create a Claude agent
curl -s -X POST http://localhost:3456/api/agents \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "'"$ARGUMENTS"'",
    "provider": "claude",
    "directory": "'$(pwd)'",
    "prompt": "'"$ARGUMENTS"'",
    "flags": { "dangerouslySkipPermissions": true }
  }'
```
