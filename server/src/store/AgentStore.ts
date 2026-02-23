import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { Agent } from '../models/Agent.js';
import type { Template } from '../models/Template.js';

export class AgentStore {
  private agents: Map<string, Agent> = new Map();
  private templates: Map<string, Template> = new Map();
  private agentsFile: string;
  private templatesFile: string;

  constructor(dataDir?: string) {
    const dir = dataDir || config.dataDir;
    fs.mkdirSync(dir, { recursive: true });
    this.agentsFile = path.join(dir, 'agents.json');
    this.templatesFile = path.join(dir, 'templates.json');
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
}
