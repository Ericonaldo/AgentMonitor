export type AgentStatus = 'running' | 'stopped' | 'error' | 'waiting_input';
export type AgentProvider = 'claude' | 'codex';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
}

export interface AgentConfig {
  provider: AgentProvider;
  directory: string;
  prompt: string;
  claudeMd?: string;
  adminEmail?: string;
  whatsappPhone?: string;
  slackWebhookUrl?: string;
  flags: {
    dangerouslySkipPermissions?: boolean;
    resume?: string;
    model?: string;
    fullAuto?: boolean;
    chrome?: boolean;
    permissionMode?: string;
    maxBudgetUsd?: number;
    allowedTools?: string;
    disallowedTools?: string;
    addDirs?: string;
    mcpConfig?: string;
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
  tokenUsage?: { input: number; output: number };
}
