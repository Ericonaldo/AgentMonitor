import type { Server, Socket } from 'socket.io';
import type { AgentManager } from '../services/AgentManager.js';

export function setupSocketHandlers(io: Server, manager: AgentManager): void {
  // Forward agent events to connected clients
  manager.on('agent:message', (agentId: string, msg: unknown) => {
    io.to(`agent:${agentId}`).emit('agent:message', { agentId, message: msg });
  });

  manager.on('agent:status', (agentId: string, status: string) => {
    io.emit('agent:status', { agentId, status });
  });

  io.on('connection', (socket: Socket) => {
    // Join agent room to receive messages
    socket.on('agent:join', (agentId: string) => {
      socket.join(`agent:${agentId}`);
    });

    socket.on('agent:leave', (agentId: string) => {
      socket.leave(`agent:${agentId}`);
    });

    // Send message to agent
    socket.on('agent:send', ({ agentId, text }: { agentId: string; text: string }) => {
      manager.sendMessage(agentId, text);
    });

    // Interrupt agent (double-Esc)
    socket.on('agent:interrupt', (agentId: string) => {
      manager.interruptAgent(agentId);
    });
  });
}
