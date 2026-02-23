import { EventEmitter } from 'events';
import type { AgentStore } from '../store/AgentStore.js';
import type { AgentManager } from './AgentManager.js';
import type { PipelineTask, MetaAgentConfig } from '../models/Task.js';
import type { AgentProvider } from '../models/Agent.js';

const DEFAULT_CLAUDE_MD = `# Agent Manager Instructions

You are an AI agent created by the Agent Manager to complete a specific task.
Follow the prompt instructions carefully and complete the task.
When done, ensure all changes are saved.
`;

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds

export class MetaAgentManager extends EventEmitter {
  private store: AgentStore;
  private agentManager: AgentManager;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(store: AgentStore, agentManager: AgentManager) {
    super();
    this.store = store;
    this.agentManager = agentManager;
  }

  getConfig(): MetaAgentConfig {
    const existing = this.store.getMetaConfig();
    if (existing) return { ...existing, running: this.running };
    return {
      running: false,
      claudeMd: DEFAULT_CLAUDE_MD,
      defaultDirectory: process.cwd(),
      defaultProvider: 'claude',
      pollIntervalMs: DEFAULT_POLL_INTERVAL,
    };
  }

  updateConfig(updates: Partial<MetaAgentConfig>): MetaAgentConfig {
    const cfg = this.getConfig();
    const newCfg: MetaAgentConfig = {
      ...cfg,
      ...updates,
      running: this.running, // running is controlled by start/stop, not config update
    };
    this.store.saveMetaAgentConfig(newCfg);
    return newCfg;
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    const cfg = this.getConfig();
    this.store.saveMetaAgentConfig({ ...cfg, running: true });

    this.emit('status', 'running');
    console.log('[MetaAgent] Started - polling every', cfg.pollIntervalMs, 'ms');

    // Run immediately, then on interval
    this.tick();
    this.pollTimer = setInterval(() => this.tick(), cfg.pollIntervalMs);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    const cfg = this.getConfig();
    this.store.saveMetaAgentConfig({ ...cfg, running: false });

    this.emit('status', 'stopped');
    console.log('[MetaAgent] Stopped');
  }

  isRunning(): boolean {
    return this.running;
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    try {
      const tasks = this.store.getAllTasks();
      if (tasks.length === 0) return;

      // Check if any running tasks have completed
      await this.checkRunningTasks(tasks);

      // Re-fetch after updates
      const updatedTasks = this.store.getAllTasks();

      // Find the current order group to process
      const pendingTasks = updatedTasks.filter(t => t.status === 'pending');
      const runningTasks = updatedTasks.filter(t => t.status === 'running');
      const failedTasks = updatedTasks.filter(t => t.status === 'failed');

      if (pendingTasks.length === 0 && runningTasks.length === 0) {
        // All tasks done (completed or failed)
        this.emit('pipeline:complete');
        console.log('[MetaAgent] All tasks completed');
        return;
      }

      if (runningTasks.length > 0) {
        // Still have running tasks - wait for them
        return;
      }

      // No running tasks - check if we can start next group
      if (pendingTasks.length > 0) {
        const nextOrder = Math.min(...pendingTasks.map(t => t.order));

        // Check if any tasks at lower orders failed - if so, don't proceed
        const lowerOrderFailed = failedTasks.some(t => t.order < nextOrder);
        if (lowerOrderFailed) {
          // Pipeline blocked - a previous step failed
          console.log('[MetaAgent] Pipeline blocked: previous step has failed tasks');
          return;
        }

        const tasksToStart = pendingTasks.filter(t => t.order === nextOrder);

        console.log(`[MetaAgent] Starting ${tasksToStart.length} task(s) at order ${nextOrder}`);

        for (const task of tasksToStart) {
          await this.startTask(task);
        }
      }
    } catch (err) {
      console.error('[MetaAgent] tick error:', err);
    }
  }

  private async checkRunningTasks(tasks: PipelineTask[]): Promise<void> {
    const runningTasks = tasks.filter(t => t.status === 'running' && t.agentId);

    for (const task of runningTasks) {
      const agent = this.agentManager.getAgent(task.agentId!);
      if (!agent) {
        // Agent was deleted externally
        task.status = 'failed';
        task.error = 'Agent was deleted';
        task.completedAt = Date.now();
        this.store.saveTask(task);
        this.emit('task:update', task);
        continue;
      }

      if (agent.status === 'stopped') {
        task.status = 'completed';
        task.completedAt = Date.now();
        this.store.saveTask(task);
        this.emit('task:update', task);
        console.log(`[MetaAgent] Task "${task.name}" completed`);
      } else if (agent.status === 'error') {
        task.status = 'failed';
        task.error = 'Agent exited with error';
        task.completedAt = Date.now();
        this.store.saveTask(task);
        this.emit('task:update', task);
        console.log(`[MetaAgent] Task "${task.name}" failed`);
      }
      // 'running' or 'waiting_input' - still in progress
    }
  }

  private async startTask(task: PipelineTask): Promise<void> {
    const cfg = this.getConfig();

    const provider: AgentProvider = task.provider || cfg.defaultProvider;
    const directory = task.directory || cfg.defaultDirectory;
    const claudeMd = task.claudeMd || cfg.claudeMd;

    try {
      const agent = await this.agentManager.createAgent(
        `[Pipeline] ${task.name}`,
        {
          provider,
          directory,
          prompt: task.prompt,
          claudeMd,
          flags: {
            dangerouslySkipPermissions: task.flags?.dangerouslySkipPermissions ?? true,
            model: task.model,
            fullAuto: task.flags?.fullAuto,
          },
        },
      );

      task.status = 'running';
      task.agentId = agent.id;
      this.store.saveTask(task);
      this.emit('task:update', task);

      console.log(`[MetaAgent] Started task "${task.name}" -> agent ${agent.id}`);
    } catch (err) {
      task.status = 'failed';
      task.error = String(err);
      task.completedAt = Date.now();
      this.store.saveTask(task);
      this.emit('task:update', task);
      console.error(`[MetaAgent] Failed to start task "${task.name}":`, err);
    }
  }
}
