import type { TunnelClient, TunnelMessage } from './TunnelClient.js';
import type { AgentManager } from './AgentManager.js';
import type { MetaAgentManager } from './MetaAgentManager.js';

/**
 * Bridges local AgentManager/MetaAgentManager events to the tunnel,
 * and handles incoming socket:c2s events from the relay.
 *
 * This mirrors the same event patterns in socket/handlers.ts and index.ts
 * but routes through the WebSocket tunnel instead of direct Socket.IO.
 */
export function setupTunnelBridge(
  tunnel: TunnelClient,
  manager: AgentManager,
  metaAgent: MetaAgentManager,
): void {
  // --- Local → Relay (via tunnel) ---

  // Agent messages → room-targeted emit
  manager.on('agent:message', (agentId: string, msg: unknown) => {
    tunnel.send({
      type: 'socket:s2c:room',
      event: 'agent:message',
      room: `agent:${agentId}`,
      args: [{ agentId, message: msg }],
    });
  });

  // Agent status → broadcast
  manager.on('agent:status', (agentId: string, status: string) => {
    tunnel.send({
      type: 'socket:s2c',
      event: 'agent:status',
      args: [{ agentId, status }],
    });
  });

  // MetaAgent task updates → broadcast
  metaAgent.on('task:update', (task: unknown) => {
    tunnel.send({
      type: 'socket:s2c',
      event: 'task:update',
      args: [task],
    });
  });

  metaAgent.on('pipeline:complete', () => {
    tunnel.send({
      type: 'socket:s2c',
      event: 'pipeline:complete',
      args: [],
    });
  });

  metaAgent.on('status', (status: string) => {
    tunnel.send({
      type: 'socket:s2c',
      event: 'meta:status',
      args: [{ running: status === 'running' }],
    });
  });

  // --- Relay → Local (via tunnel) ---

  tunnel.onMessage((msg: TunnelMessage) => {
    if (msg.type !== 'socket:c2s') return;

    const event = msg.event as string;
    const args = msg.args as unknown[];

    switch (event) {
      case 'agent:send': {
        const data = args[0] as { agentId: string; text: string };
        manager.sendMessage(data.agentId, data.text);
        break;
      }
      case 'agent:interrupt': {
        const agentId = args[0] as string;
        manager.interruptAgent(agentId);
        break;
      }
      // agent:join/leave are handled on relay side (room management)
      // No local action needed for those
    }
  });
}
