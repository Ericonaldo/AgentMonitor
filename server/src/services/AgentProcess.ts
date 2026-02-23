import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { config } from '../config.js';
import type { AgentProvider } from '../models/Agent.js';

export interface StreamMessage {
  type: string;
  subtype?: string;
  // claude: assistant message
  content_block_type?: string;
  text?: string;
  // claude: tool use
  tool_name?: string;
  // claude: result
  result?: {
    cost_usd?: number;
    session_id?: string;
    is_error?: boolean;
  };
  // codex: item.completed
  item?: {
    id?: string;
    type?: string;
    text?: string;
    command?: string;
    aggregated_output?: string;
    exit_code?: number;
    status?: string;
  };
  // codex: turn.completed usage
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
  // codex: thread info
  thread_id?: string;
  // generic
  [key: string]: unknown;
}

export interface ProcessStartOpts {
  provider: AgentProvider;
  directory: string;
  prompt: string;
  dangerouslySkipPermissions?: boolean;
  resume?: string;
  model?: string;
  fullAuto?: boolean;
}

/** Shell-escape a string for use with spawn shell: true */
function shellEscape(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

export class AgentProcess extends EventEmitter {
  private process: ChildProcess | null = null;
  private buffer = '';
  private _pid: number | undefined;
  private _provider: AgentProvider = 'claude';

  get pid(): number | undefined {
    return this._pid;
  }

  get provider(): AgentProvider {
    return this._provider;
  }

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  start(opts: ProcessStartOpts): void {
    this._provider = opts.provider;

    const { bin, args } = this.buildCommand(opts);

    // Clean env: remove Claude-specific vars to allow nested sessions
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;
    delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;

    this.process = spawn(bin, args, {
      cwd: opts.directory,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
      shell: true,
    });

    this._pid = this.process.pid;

    // Close stdin immediately - Claude -p waits for stdin EOF before starting
    // when stdin is a pipe. The prompt is passed via -p flag on the command line.
    this.process.stdin?.end();

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

  private buildCommand(opts: ProcessStartOpts): { bin: string; args: string[] } {
    if (opts.provider === 'codex') {
      return this.buildCodexCommand(opts);
    }
    return this.buildClaudeCommand(opts);
  }

  private buildClaudeCommand(opts: ProcessStartOpts): { bin: string; args: string[] } {
    // Shell-escape the prompt since we use shell: true for spawning
    const args: string[] = [
      '-p', shellEscape(opts.prompt),
      '--output-format', 'stream-json',
      '--verbose',
    ];

    if (opts.dangerouslySkipPermissions) {
      args.push('--dangerously-skip-permissions');
    }

    if (opts.resume) {
      args.push('--resume', shellEscape(opts.resume));
    }

    if (opts.model) {
      args.push('--model', shellEscape(opts.model));
    }

    return { bin: config.claudeBin, args };
  }

  private buildCodexCommand(opts: ProcessStartOpts): { bin: string; args: string[] } {
    // Shell-escape values that may contain spaces since we use shell: true
    const args: string[] = [
      'exec',
      '--json',
      shellEscape(opts.prompt),
    ];

    if (opts.dangerouslySkipPermissions) {
      args.push('--dangerously-bypass-approvals-and-sandbox');
    } else if (opts.fullAuto) {
      args.push('--full-auto');
    }

    if (opts.model) {
      args.push('--model', shellEscape(opts.model));
    }

    // Codex uses --cd instead of cwd for working directory, but we also set cwd
    args.push('--cd', shellEscape(opts.directory));
    args.push('--skip-git-repo-check');

    return { bin: config.codexBin, args };
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
    // Note: stdin is closed in -p mode. Messages can only be sent in interactive mode.
    if (this.process?.stdin?.writable) {
      if (this._provider === 'claude') {
        const msg = JSON.stringify({
          type: 'user_message',
          content: text,
        });
        this.process.stdin.write(msg + '\n');
      } else {
        // Codex exec doesn't support stdin interaction
        // but we write anyway in case future versions do
        this.process.stdin.write(text + '\n');
      }
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
