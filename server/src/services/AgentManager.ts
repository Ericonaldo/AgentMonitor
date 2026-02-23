import { v4 as uuid } from 'uuid';
import { EventEmitter } from 'events';
import type { Agent, AgentConfig, AgentMessage, AgentStatus } from '../models/Agent.js';
import { AgentStore } from '../store/AgentStore.js';
import { AgentProcess, type StreamMessage } from './AgentProcess.js';
import { WorktreeManager } from './WorktreeManager.js';
import { EmailNotifier } from './EmailNotifier.js';

export class AgentManager extends EventEmitter {
  private processes: Map<string, AgentProcess> = new Map();
  private store: AgentStore;
  private worktreeManager: WorktreeManager;
  private emailNotifier: EmailNotifier;

  constructor(store: AgentStore, worktreeManager?: WorktreeManager, emailNotifier?: EmailNotifier) {
    super();
    this.store = store;
    this.worktreeManager = worktreeManager || new WorktreeManager();
    this.emailNotifier = emailNotifier || new EmailNotifier();
  }

  async createAgent(name: string, agentConfig: AgentConfig): Promise<Agent> {
    const id = uuid();
    const branchName = `agent-${id.slice(0, 8)}`;

    let worktreePath: string | undefined;
    let worktreeBranch: string | undefined;

    // Create git worktree for isolation
    try {
      const result = this.worktreeManager.createWorktree(
        agentConfig.directory,
        branchName,
        agentConfig.claudeMd,
      );
      worktreePath = result.worktreePath;
      worktreeBranch = result.branch;
    } catch (err) {
      // If worktree creation fails, work directly in the directory
      console.warn('[AgentManager] Worktree creation failed, using directory directly:', err);
      worktreePath = agentConfig.directory;
    }

    const agent: Agent = {
      id,
      name,
      status: 'running',
      config: agentConfig,
      worktreePath,
      worktreeBranch,
      messages: [],
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };

    this.store.saveAgent(agent);
    this.startProcess(agent);

    return agent;
  }

  private startProcess(agent: Agent): void {
    const proc = new AgentProcess();
    this.processes.set(agent.id, proc);

    proc.on('message', (msg: StreamMessage) => {
      this.handleStreamMessage(agent.id, msg, agent.config.provider);
    });

    proc.on('stderr', (text: string) => {
      console.error(`[Agent ${agent.id}] stderr: ${text}`);
    });

    proc.on('exit', (code: number | null) => {
      this.updateAgentStatus(agent.id, code === 0 ? 'stopped' : 'error');
      this.processes.delete(agent.id);
    });

    proc.on('error', (err: Error) => {
      console.error(`[Agent ${agent.id}] process error:`, err);
      this.updateAgentStatus(agent.id, 'error');
    });

    proc.start({
      provider: agent.config.provider,
      directory: agent.worktreePath || agent.config.directory,
      prompt: agent.config.prompt,
      dangerouslySkipPermissions: agent.config.flags.dangerouslySkipPermissions,
      resume: agent.config.flags.resume,
      model: agent.config.flags.model,
      fullAuto: agent.config.flags.fullAuto,
    });

    agent.pid = proc.pid;
    this.store.saveAgent(agent);
  }

  private handleStreamMessage(agentId: string, msg: StreamMessage, provider: string): void {
    const agent = this.store.getAgent(agentId);
    if (!agent) return;

    if (provider === 'codex') {
      this.handleCodexMessage(agent, msg);
    } else {
      this.handleClaudeMessage(agent, msg);
    }

    // Emit to socket
    this.emit('agent:message', agentId, msg);
  }

  private handleClaudeMessage(agent: Agent, msg: StreamMessage): void {
    if (msg.type === 'assistant' && msg.subtype === 'text') {
      agent.messages.push({
        id: uuid(),
        role: 'assistant',
        content: msg.text || '',
        timestamp: Date.now(),
      });
      agent.lastActivity = Date.now();
      this.store.saveAgent(agent);
    }

    if (msg.type === 'assistant' && msg.subtype === 'tool_use') {
      agent.messages.push({
        id: uuid(),
        role: 'tool',
        content: `Using tool: ${msg.tool_name || 'unknown'}`,
        timestamp: Date.now(),
      });
      agent.lastActivity = Date.now();
      this.store.saveAgent(agent);
    }

    if (msg.type === 'result') {
      if (msg.result?.cost_usd) {
        agent.costUsd = msg.result.cost_usd;
      }
      this.updateAgentStatus(agent.id, 'stopped');
    }

    if (this.isClaudePermissionPrompt(msg)) {
      this.handleWaitingInput(agent, msg);
    }
  }

  private handleCodexMessage(agent: Agent, msg: StreamMessage): void {
    // Codex JSONL events: thread.started, turn.started, item.completed, turn.completed
    if (msg.type === 'item.completed' && msg.item) {
      if (msg.item.type === 'agent_message') {
        agent.messages.push({
          id: uuid(),
          role: 'assistant',
          content: msg.item.text || '',
          timestamp: Date.now(),
        });
        agent.lastActivity = Date.now();
        this.store.saveAgent(agent);
      } else if (msg.item.type === 'tool_call' || msg.item.type === 'function_call') {
        agent.messages.push({
          id: uuid(),
          role: 'tool',
          content: `Tool: ${msg.item.text || JSON.stringify(msg.item)}`,
          timestamp: Date.now(),
        });
        agent.lastActivity = Date.now();
        this.store.saveAgent(agent);
      } else if (msg.item.type === 'reasoning') {
        agent.messages.push({
          id: uuid(),
          role: 'system',
          content: msg.item.text || '',
          timestamp: Date.now(),
        });
        agent.lastActivity = Date.now();
        this.store.saveAgent(agent);
      }
    }

    if (msg.type === 'turn.completed') {
      if (msg.usage) {
        agent.tokenUsage = {
          input: (agent.tokenUsage?.input || 0) + (msg.usage.input_tokens || 0),
          output: (agent.tokenUsage?.output || 0) + (msg.usage.output_tokens || 0),
        };
        this.store.saveAgent(agent);
      }
    }
  }

  private isClaudePermissionPrompt(msg: StreamMessage): boolean {
    if (msg.type === 'assistant' && msg.subtype === 'permission') return true;
    const text = (msg.text || '').toLowerCase();
    return text.includes('permission') && text.includes('allow');
  }

  private handleWaitingInput(agent: Agent, msg: StreamMessage): void {
    this.updateAgentStatus(agent.id, 'waiting_input');
    if (agent.config.adminEmail) {
      this.emailNotifier.notifyHumanNeeded(
        agent.config.adminEmail,
        agent.name,
        `Agent is waiting for permission/input.\nLast message: ${msg.text || msg.item?.text || JSON.stringify(msg)}`,
      );
    }
  }

  private updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.store.getAgent(agentId);
    if (agent) {
      agent.status = status;
      agent.lastActivity = Date.now();
      this.store.saveAgent(agent);
      this.emit('agent:status', agentId, status);
    }
  }

  sendMessage(agentId: string, text: string): void {
    const proc = this.processes.get(agentId);
    if (proc) {
      const agent = this.store.getAgent(agentId);
      if (agent) {
        agent.messages.push({
          id: uuid(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
        });
        agent.lastActivity = Date.now();
        this.store.saveAgent(agent);
      }
      proc.sendMessage(text);
      this.emit('agent:message', agentId, {
        type: 'user',
        text,
      });
    }
  }

  interruptAgent(agentId: string): void {
    const proc = this.processes.get(agentId);
    if (proc) {
      proc.interrupt();
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const proc = this.processes.get(agentId);
    if (proc) {
      proc.stop();
    }
    this.updateAgentStatus(agentId, 'stopped');
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.stopAgent(agentId);
    const agent = this.store.getAgent(agentId);
    if (agent?.worktreePath && agent.worktreeBranch) {
      try {
        this.worktreeManager.removeWorktree(
          agent.config.directory,
          agent.worktreePath,
          agent.worktreeBranch,
        );
      } catch (err) {
        console.warn('[AgentManager] Worktree cleanup failed:', err);
      }
    }
    this.store.deleteAgent(agentId);
  }

  async stopAllAgents(): Promise<void> {
    const agents = this.store.getAllAgents();
    for (const agent of agents) {
      if (agent.status === 'running' || agent.status === 'waiting_input') {
        await this.stopAgent(agent.id);
      }
    }
  }

  updateClaudeMd(agentId: string, content: string): void {
    const agent = this.store.getAgent(agentId);
    if (agent?.worktreePath) {
      this.worktreeManager.updateClaudeMd(agent.worktreePath, content);
    }
  }

  getAgent(agentId: string): Agent | undefined {
    return this.store.getAgent(agentId);
  }

  getAllAgents(): Agent[] {
    return this.store.getAllAgents();
  }
}
