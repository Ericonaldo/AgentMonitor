#!/usr/bin/env bash
set -euo pipefail

# Deploy AgentMonitor Relay to public server
# Usage: ./relay/scripts/deploy.sh [token]
#
# Prerequisites:
#   - SSH access to newserver (see ~/.ssh/config)
#   - Node.js 18+ on the remote server
#   - pm2 installed globally on the remote server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE="newserver"
RELAY_TOKEN="${1:-${RELAY_TOKEN:-}}"

if [ -z "$RELAY_TOKEN" ]; then
  echo "Error: RELAY_TOKEN required. Pass as argument or set env var."
  echo "Usage: $0 <token>"
  exit 1
fi

# Get remote home directory
REMOTE_HOME=$(ssh "$REMOTE" 'echo $HOME')
REMOTE_DIR="$REMOTE_HOME/agentmonitor-relay"

echo "=== Building client ==="
cd "$PROJECT_ROOT"
npm run build:client

echo "=== Building relay ==="
cd "$PROJECT_ROOT/relay"
npx tsc

echo "=== Deploying to $REMOTE:$REMOTE_DIR ==="

# Create remote directory
ssh "$REMOTE" "mkdir -p $REMOTE_DIR/client-dist $REMOTE_DIR/dist"

# Sync relay build output
rsync -avz --delete "$PROJECT_ROOT/relay/dist/" "$REMOTE:$REMOTE_DIR/dist/"
rsync -avz "$PROJECT_ROOT/relay/package.json" "$PROJECT_ROOT/relay/package-lock.json" "$REMOTE:$REMOTE_DIR/"

# Sync client build
rsync -avz --delete "$PROJECT_ROOT/client/dist/" "$REMOTE:$REMOTE_DIR/client-dist/"

# Sync docs build if it exists
if [ -d "$PROJECT_ROOT/docs/.vitepress/dist" ]; then
  ssh "$REMOTE" "mkdir -p $REMOTE_DIR/docs-dist"
  rsync -avz --delete "$PROJECT_ROOT/docs/.vitepress/dist/" "$REMOTE:$REMOTE_DIR/docs-dist/"
fi

echo "=== Installing dependencies on remote ==="
ssh "$REMOTE" "cd $REMOTE_DIR && npm ci --omit=dev 2>&1 | tail -3"

echo "=== Starting relay with pm2 ==="
ssh "$REMOTE" "export PATH=\$HOME/.npm-global/bin:\$PATH && cd $REMOTE_DIR && \
  pm2 delete agentmonitor-relay 2>/dev/null || true && \
  RELAY_TOKEN='$RELAY_TOKEN' RELAY_PORT=3457 \
  pm2 start dist/index.js --name agentmonitor-relay \
    --restart-delay=3000"

echo ""
echo "=== Deploy complete ==="
echo "Relay running at: http://192.3.168.14:3457"
echo "Tunnel endpoint:  ws://192.3.168.14:3457/tunnel"
echo ""
echo "To connect from local machine, set:"
echo "  RELAY_URL=ws://192.3.168.14:3457/tunnel"
echo "  RELAY_TOKEN=$RELAY_TOKEN"
