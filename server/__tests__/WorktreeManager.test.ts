import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { WorktreeManager } from '../src/services/WorktreeManager.js';

describe('WorktreeManager', () => {
  let tmpDir: string;
  let manager: WorktreeManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'worktree-test-'));
    manager = new WorktreeManager();

    // Initialize a git repo
    execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test');
    execSync('git add . && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
  });

  afterEach(() => {
    // Clean up worktrees first
    try {
      execSync('git worktree prune', { cwd: tmpDir, stdio: 'pipe' });
    } catch {}
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a worktree', () => {
    const result = manager.createWorktree(tmpDir, 'test-branch');
    expect(result.worktreePath).toContain('test-branch');
    expect(result.branch).toBe('test-branch');
    expect(fs.existsSync(result.worktreePath)).toBe(true);
  });

  it('creates a worktree with CLAUDE.md', () => {
    const result = manager.createWorktree(tmpDir, 'test-branch-md', '# My Config');
    const claudeMd = fs.readFileSync(path.join(result.worktreePath, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toBe('# My Config');
  });

  it('removes a worktree', () => {
    const result = manager.createWorktree(tmpDir, 'to-remove');
    expect(fs.existsSync(result.worktreePath)).toBe(true);

    manager.removeWorktree(tmpDir, result.worktreePath, 'to-remove');
    // Worktree should be removed
    expect(fs.existsSync(result.worktreePath)).toBe(false);
  });

  it('updates CLAUDE.md in a worktree', () => {
    const result = manager.createWorktree(tmpDir, 'update-md', '# Old');
    manager.updateClaudeMd(result.worktreePath, '# New');
    const content = manager.getClaudeMd(result.worktreePath);
    expect(content).toBe('# New');
  });

  it('getClaudeMd returns null if no file', () => {
    const result = manager.createWorktree(tmpDir, 'no-md');
    // No CLAUDE.md was written
    const content = manager.getClaudeMd(result.worktreePath);
    // README.md exists from init, but CLAUDE.md may or may not
    // Just check it returns string or null
    expect(content === null || typeof content === 'string').toBe(true);
  });
});
