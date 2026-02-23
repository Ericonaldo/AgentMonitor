import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function joinAgent(agentId: string): void {
  getSocket().emit('agent:join', agentId);
}

export function leaveAgent(agentId: string): void {
  getSocket().emit('agent:leave', agentId);
}

export function sendMessage(agentId: string, text: string): void {
  getSocket().emit('agent:send', { agentId, text });
}

export function interruptAgent(agentId: string): void {
  getSocket().emit('agent:interrupt', agentId);
}
