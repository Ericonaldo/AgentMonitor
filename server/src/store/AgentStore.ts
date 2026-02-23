import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { Agent } from '../models/Agent.js';
import type { Template } from '../models/Template.js';
import type { PipelineTask, MetaAgentConfig } from '../models/Task.js';

export class AgentStore {
  private agents: Map<string, Agent> = new Map();
  private templates: Map<string, Template> = new Map();
  private tasks: Map<string, PipelineTask> = new Map();
  private metaConfig: MetaAgentConfig | null = null;
  private agentsFile: string;
  private templatesFile: string;
  private tasksFile: string;
  private metaConfigFile: string;

  constructor(dataDir?: string) {
    const dir = dataDir || config.dataDir;
    fs.mkdirSync(dir, { recursive: true });
    this.agentsFile = path.join(dir, 'agents.json');
    this.templatesFile = path.join(dir, 'templates.json');
    this.tasksFile = path.join(dir, 'tasks.json');
    this.metaConfigFile = path.join(dir, 'meta-agent.json');
    this.load();
  }

  private load(): void {
    if (fs.existsSync(this.agentsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.agentsFile, 'utf-8'));
        for (const a of data) {
          this.agents.set(a.id, a);
        }
      } catch {
        // ignore corrupt file
      }
    }
    if (fs.existsSync(this.templatesFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.templatesFile, 'utf-8'));
        for (const t of data) {
          this.templates.set(t.id, t);
        }
      } catch {
        // ignore corrupt file
      }
    }
    if (fs.existsSync(this.tasksFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.tasksFile, 'utf-8'));
        for (const t of data) {
          this.tasks.set(t.id, t);
        }
      } catch {
        // ignore corrupt file
      }
    }
    if (fs.existsSync(this.metaConfigFile)) {
      try {
        this.metaConfig = JSON.parse(fs.readFileSync(this.metaConfigFile, 'utf-8'));
      } catch {
        // ignore corrupt file
      }
    }
  }

  private saveAgents(): void {
    fs.writeFileSync(
      this.agentsFile,
      JSON.stringify([...this.agents.values()], null, 2),
    );
  }

  private saveTemplates(): void {
    fs.writeFileSync(
      this.templatesFile,
      JSON.stringify([...this.templates.values()], null, 2),
    );
  }

  private saveTasks(): void {
    fs.writeFileSync(
      this.tasksFile,
      JSON.stringify([...this.tasks.values()], null, 2),
    );
  }

  private saveMetaConfig(): void {
    if (this.metaConfig) {
      fs.writeFileSync(
        this.metaConfigFile,
        JSON.stringify(this.metaConfig, null, 2),
      );
    }
  }

  // Agent methods
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return [...this.agents.values()];
  }

  saveAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.saveAgents();
  }

  deleteAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    if (deleted) this.saveAgents();
    return deleted;
  }

  // Template methods
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): Template[] {
    return [...this.templates.values()];
  }

  saveTemplate(template: Template): void {
    this.templates.set(template.id, template);
    this.saveTemplates();
  }

  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) this.saveTemplates();
    return deleted;
  }

  // Task methods
  getTask(id: string): PipelineTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): PipelineTask[] {
    return [...this.tasks.values()].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  }

  saveTask(task: PipelineTask): void {
    this.tasks.set(task.id, task);
    this.saveTasks();
  }

  deleteTask(id: string): boolean {
    const deleted = this.tasks.delete(id);
    if (deleted) this.saveTasks();
    return deleted;
  }

  clearCompletedTasks(): void {
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.tasks.delete(id);
      }
    }
    this.saveTasks();
  }

  // Meta agent config methods
  getMetaConfig(): MetaAgentConfig | null {
    return this.metaConfig;
  }

  saveMetaAgentConfig(cfg: MetaAgentConfig): void {
    this.metaConfig = cfg;
    this.saveMetaConfig();
  }
}
