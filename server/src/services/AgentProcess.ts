import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { config } from '../config.js';

export interface StreamMessage {
  type: string;
  subtype?: string;
  // assistant message
  content_block_type?: string;
  text?: string;
  // tool use
  tool_name?: string;
  // result
  result?: {
    cost_usd?: number;
    session_id?: string;
    is_error?: boolean;
  };
  // generic
  [key: string]: unknown;
}

export class AgentProcess extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private _pid: number | undefined;

  get pid(): number | undefined {
    return this._pid;
  }

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  start(opts: {
    directory: string;
    prompt: string;
    dangerouslySkipPermissions?: boolean;
    resume?: string;
  }): void {
    const args: string[] = [
      '-p', opts.prompt,
      '--output-format', 'stream-json',
    ];

    if (opts.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    if (opts.resume) {
      args.push('--resume', opts.resume);
    }

    this.process = spawn(config.claudeBin, args, {
      cwd: opts.directory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this._pid = this.process.pid;

    this.process.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.emit('stderr', data.toString());
    });

    this.process.on('close', (code) => {
      this.process = null;
      this._pid = undefined;
      this.emit('exit', code);
    });

    this.process.on('error', (err) => {
      this.emit('error', err);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg: StreamMessage = JSON.parse(trimmed);
        this.emit('message', msg);
      } catch {
        // Not JSON, emit as raw text
        this.emit('raw', trimmed);
      }
    }
  }

  sendMessage(text: string): void {
    if (this.process?.stdin?.writable) {
      const msg = JSON.stringify({
        type: 'user_message',
        content: text,
      });
      this.process.stdin.write(msg + '\n');
    }
  }

  interrupt(): void {
    if (this.process) {
      this.process.kill('SIGINT');
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}
