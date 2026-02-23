# List Agents

List all agents managed by Agent Monitor with their status, provider, and cost.

## Steps

1. Query the Agent Monitor API
2. Display a formatted summary of all agents

## Command

```bash
curl -s http://localhost:3456/api/agents | python3 -c "
import json, sys
agents = json.load(sys.stdin)
if not agents:
    print('No agents running.')
else:
    for a in agents:
        cost = f'\${a[\"costUsd\"]:.4f}' if a.get('costUsd') is not None else 'N/A'
        print(f'{a[\"name\"]} | {a[\"config\"][\"provider\"].upper()} | {a[\"status\"]} | {cost} | {a[\"id\"][:8]}...')
"
```
