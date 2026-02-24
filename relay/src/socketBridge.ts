import type { Server, Socket } from 'socket.io';
import type { TunnelManager, TunnelMessage } from './tunnel.js';

/**
 * Bridges dashboard Socket.IO connections with the tunnel to the local machine.
 *
 * Dashboard → Relay (Socket.IO) → Tunnel (WS) → Local Machine
 * Local Machine → Tunnel (WS) → Relay (Socket.IO) → Dashboard
 */
export function setupSocketBridge(io: Server, tunnel: TunnelManager): void {
  // Handle messages from tunnel (local machine → dashboard)
  tunnel.onMessage((msg: TunnelMessage) => {
    if (msg.type === 'socket:s2c') {
      // Broadcast to all connected dashboard clients
      io.emit(msg.event as string, ...(msg.args as unknown[] || []));
    } else if (msg.type === 'socket:s2c:room') {
      // Emit to a specific room
      io.to(msg.room as string).emit(msg.event as string, ...(msg.args as unknown[] || []));
    }
  });

  // Handle dashboard client connections
  io.on('connection', (socket: Socket) => {
    // Forward client-to-server events through tunnel
    socket.on('agent:join', (agentId: string) => {
      socket.join(`agent:${agentId}`);
      tunnel.send({
        type: 'socket:c2s',
        event: 'agent:join',
        args: [agentId],
      });
    });

    socket.on('agent:leave', (agentId: string) => {
      socket.leave(`agent:${agentId}`);
      tunnel.send({
        type: 'socket:c2s',
        event: 'agent:leave',
        args: [agentId],
      });
    });

    socket.on('agent:send', (data: { agentId: string; text: string }) => {
      tunnel.send({
        type: 'socket:c2s',
        event: 'agent:send',
        args: [data],
      });
    });

    socket.on('agent:interrupt', (agentId: string) => {
      tunnel.send({
        type: 'socket:c2s',
        event: 'agent:interrupt',
        args: [agentId],
      });
    });
  });
}
