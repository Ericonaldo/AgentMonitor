export type AgentStatus = 'running' | 'stopped' | 'error' | 'waiting_input';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
}

export interface AgentConfig {
  directory: string;
  prompt: string;
  claudeMd?: string;
  adminEmail?: string;
  flags: {
    dangerouslySkipPermissions?: boolean;
    resume?: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  config: AgentConfig;
  worktreePath?: string;
  worktreeBranch?: string;
  messages: AgentMessage[];
  lastActivity: number;
  createdAt: number;
  costUsd?: number;
  pid?: number;
}
