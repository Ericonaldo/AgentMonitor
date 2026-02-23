import fs from 'fs';
import path from 'path';

export interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export class DirectoryBrowser {
  listDirectory(dirPath: string): DirEntry[] {
    const resolved = path.resolve(dirPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Directory not found: ${resolved}`);
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      throw new Error(`Not a directory: ${resolved}`);
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    return entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: path.join(resolved, e.name),
        isDirectory: e.isDirectory(),
      }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  getParent(dirPath: string): string {
    return path.dirname(path.resolve(dirPath));
  }
}
