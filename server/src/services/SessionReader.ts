import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SessionInfo {
  id: string;
  projectPath: string;
  lastModified: number;
}

export class SessionReader {
  private claudeDir: string;

  constructor(claudeDir?: string) {
    this.claudeDir = claudeDir || path.join(os.homedir(), '.claude', 'projects');
  }

  listSessions(): SessionInfo[] {
    const sessions: SessionInfo[] = [];

    if (!fs.existsSync(this.claudeDir)) {
      return sessions;
    }

    const projectDirs = fs.readdirSync(this.claudeDir, { withFileTypes: true });
    for (const dir of projectDirs) {
      if (!dir.isDirectory()) continue;

      const projectPath = path.join(this.claudeDir, dir.name);
      const files = fs.readdirSync(projectPath);

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const sessionId = file.replace('.jsonl', '');
        const filePath = path.join(projectPath, file);
        const stat = fs.statSync(filePath);

        sessions.push({
          id: sessionId,
          projectPath: dir.name.replace(/-/g, '/'),
          lastModified: stat.mtimeMs,
        });
      }
    }

    return sessions.sort((a, b) => b.lastModified - a.lastModified);
  }
}
