# Agent Monitor - Start & Manage

Start the Agent Monitor development server and open the web UI. Use this to manage, create, and monitor Claude Code and Codex agents from a browser.

## Steps

1. Check if the server is already running on port 3456
2. If not running, start it with `npm run dev` in the background
3. Wait for the server to be ready
4. Report the URL: http://localhost:3456

## Usage

After starting, you can:
- Create agents from the web UI at http://localhost:3456/create
- View running agents on the dashboard at http://localhost:3456
- Manage the task pipeline at http://localhost:3456/pipeline
- Manage CLAUDE.md templates at http://localhost:3456/templates

## Commands

```bash
# Check if already running
lsof -i :3456 | grep LISTEN

# Start if not running
cd $ARGUMENTS && npm run dev &

# Verify it started
sleep 3 && curl -s http://localhost:3456/api/health
```
