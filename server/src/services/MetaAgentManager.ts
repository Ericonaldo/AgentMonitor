import { EventEmitter } from 'events';
import type { AgentStore } from '../store/AgentStore.js';
import type { AgentManager } from './AgentManager.js';
import type { EmailNotifier } from './EmailNotifier.js';
import type { WhatsAppNotifier } from './WhatsAppNotifier.js';
import type { PipelineTask, MetaAgentConfig } from '../models/Task.js';
import type { AgentProvider } from '../models/Agent.js';

const DEFAULT_CLAUDE_MD = `# Agent Manager Instructions

You are an AI agent created by the Agent Manager to complete a specific task.
Follow the prompt instructions carefully and complete the task.
When done, ensure all changes are saved.
`;

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds
const DEFAULT_STUCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export class MetaAgentManager extends EventEmitter {
  private store: AgentStore;
  private agentManager: AgentManager;
  private emailNotifier: EmailNotifier | null;
  private whatsappNotifier: WhatsAppNotifier | null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    store: AgentStore,
    agentManager: AgentManager,
    emailNotifier?: EmailNotifier,
    whatsappNotifier?: WhatsAppNotifier,
  ) {
    super();
    this.store = store;
    this.agentManager = agentManager;
    this.emailNotifier = emailNotifier || null;
    this.whatsappNotifier = whatsappNotifier || null;
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
        await this.onPipelineComplete(updatedTasks, failedTasks);
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
    const cfg = this.getConfig();
    const stuckTimeout = cfg.stuckTimeoutMs || DEFAULT_STUCK_TIMEOUT;

    for (const task of runningTasks) {
      const agent = this.agentManager.getAgent(task.agentId!);
      if (!agent) {
        // Agent was deleted externally
        task.status = 'failed';
        task.error = 'Agent was deleted';
        task.completedAt = Date.now();
        this.store.saveTask(task);
        this.emit('task:update', task);
        await this.notifyTaskFailed(task);
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
        await this.notifyTaskFailed(task);
      } else if (agent.status === 'waiting_input') {
        // Stuck agent detection: check how long it's been waiting
        const waitingDuration = Date.now() - agent.lastActivity;
        if (waitingDuration > stuckTimeout) {
          // Only notify if we haven't already (or last notification was > stuckTimeout ago)
          if (!task.notifiedAt || (Date.now() - task.notifiedAt) > stuckTimeout) {
            console.log(`[MetaAgent] Task "${task.name}" agent stuck in waiting_input for ${Math.round(waitingDuration / 1000)}s`);
            await this.notifyStuckAgent(task, agent.name, waitingDuration);
            task.notifiedAt = Date.now();
            this.store.saveTask(task);
          }
        }
      }
      // 'running' - still in progress, do nothing
    }
  }

  private async onPipelineComplete(allTasks: PipelineTask[], failedTasks: PipelineTask[]): Promise<void> {
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    console.log(`[MetaAgent] All tasks done: ${completedTasks.length} completed, ${failedTasks.length} failed`);

    // Auto-cleanup: delete agents (stops process + removes worktree)
    for (const task of allTasks) {
      if (task.agentId) {
        try {
          await this.agentManager.deleteAgent(task.agentId);
          console.log(`[MetaAgent] Cleaned up agent ${task.agentId} for task "${task.name}"`);
        } catch (err) {
          console.warn(`[MetaAgent] Failed to cleanup agent ${task.agentId}:`, err);
        }
      }
    }

    // Send pipeline-complete notification
    await this.notifyPipelineComplete(completedTasks.length, failedTasks.length);

    // Auto-stop the manager
    this.emit('pipeline:complete');
    this.stop();
  }

  private async notifyTaskFailed(task: PipelineTask): Promise<void> {
    const cfg = this.getConfig();
    const subject = `[Agent Manager] Task "${task.name}" failed`;
    const body = `Task "${task.name}" has failed.\n\nError: ${task.error || 'Unknown error'}\nTask ID: ${task.id}`;

    if (cfg.adminEmail && this.emailNotifier) {
      await this.emailNotifier.sendNotification(cfg.adminEmail, subject, body);
    }
    if (cfg.whatsappPhone && this.whatsappNotifier) {
      await this.whatsappNotifier.sendNotification(cfg.whatsappPhone, body);
    }
  }

  private async notifyStuckAgent(task: PipelineTask, agentName: string, waitingMs: number): Promise<void> {
    const cfg = this.getConfig();
    const minutes = Math.round(waitingMs / 60000);
    const subject = `[Agent Manager] Agent "${agentName}" is stuck (waiting ${minutes}m)`;
    const body = `Agent "${agentName}" for task "${task.name}" has been waiting for human input for ${minutes} minute(s).\n\nPlease check the agent and provide the required input.\nTask ID: ${task.id}\nAgent ID: ${task.agentId}`;

    if (cfg.adminEmail && this.emailNotifier) {
      await this.emailNotifier.sendNotification(cfg.adminEmail, subject, body);
    }
    if (cfg.whatsappPhone && this.whatsappNotifier) {
      await this.whatsappNotifier.sendNotification(cfg.whatsappPhone, body);
    }
  }

  private async notifyPipelineComplete(completedCount: number, failedCount: number): Promise<void> {
    const cfg = this.getConfig();
    const status = failedCount > 0 ? 'completed with failures' : 'completed successfully';
    const subject = `[Agent Manager] Pipeline ${status}`;
    const body = `The pipeline has ${status}.\n\nCompleted: ${completedCount} task(s)\nFailed: ${failedCount} task(s)`;

    if (cfg.adminEmail && this.emailNotifier) {
      await this.emailNotifier.sendNotification(cfg.adminEmail, subject, body);
    }
    if (cfg.whatsappPhone && this.whatsappNotifier) {
      await this.whatsappNotifier.sendNotification(cfg.whatsappPhone, body);
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
      await this.notifyTaskFailed(task);
    }
  }
}
