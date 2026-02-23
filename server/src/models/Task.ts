import type { AgentProvider } from './Agent.js';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PipelineTask {
  id: string;
  name: string;
  prompt: string;
  directory?: string;
  provider?: AgentProvider;
  model?: string;
  claudeMd?: string;
  flags?: {
    dangerouslySkipPermissions?: boolean;
    fullAuto?: boolean;
  };
  status: TaskStatus;
  agentId?: string;
  order: number; // Tasks with same order run in parallel; sequential orders wait for previous
  createdAt: number;
  completedAt?: number;
  error?: string;
  notifiedAt?: number; // Timestamp of last stuck-agent notification (avoids spam)
}

export interface MetaAgentConfig {
  running: boolean;
  agentId?: string;
  claudeMd: string;
  defaultDirectory: string;
  defaultProvider: AgentProvider;
  pollIntervalMs: number;
  adminEmail?: string;
  whatsappPhone?: string;
  stuckTimeoutMs?: number; // How long an agent can be in waiting_input before notification (default 5 min)
}
