import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DirectoryBrowser } from '../src/services/DirectoryBrowser.js';

describe('DirectoryBrowser', () => {
  let tmpDir: string;
  let browser: DirectoryBrowser;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dirbrowser-test-'));
    browser = new DirectoryBrowser();

    // Create test structure
    fs.mkdirSync(path.join(tmpDir, 'subdir1'));
    fs.mkdirSync(path.join(tmpDir, 'subdir2'));
    fs.writeFileSync(path.join(tmpDir, 'file1.txt'), 'hello');
    fs.writeFileSync(path.join(tmpDir, 'file2.js'), 'world');
    fs.mkdirSync(path.join(tmpDir, '.hidden'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('lists directory contents', () => {
    const entries = browser.listDirectory(tmpDir);
    // Should not include hidden directories
    const names = entries.map((e) => e.name);
    expect(names).toContain('subdir1');
    expect(names).toContain('subdir2');
    expect(names).toContain('file1.txt');
    expect(names).not.toContain('.hidden');
  });

  it('directories come before files', () => {
    const entries = browser.listDirectory(tmpDir);
    const firstFile = entries.findIndex((e) => !e.isDirectory);
    const lastDir = entries.findLastIndex((e) => e.isDirectory);
    if (firstFile !== -1 && lastDir !== -1) {
      expect(lastDir).toBeLessThan(firstFile);
    }
  });

  it('throws for nonexistent directory', () => {
    expect(() => browser.listDirectory('/nonexistent/path')).toThrow();
  });

  it('returns parent directory', () => {
    const parent = browser.getParent(tmpDir);
    expect(parent).toBe(path.dirname(tmpDir));
  });
});
