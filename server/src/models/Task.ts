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
}

export interface MetaAgentConfig {
  running: boolean;
  agentId?: string;
  claudeMd: string;
  defaultDirectory: string;
  defaultProvider: AgentProvider;
  pollIntervalMs: number;
}
