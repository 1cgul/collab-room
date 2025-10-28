import * as vscode from 'vscode';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export class Logger {
  private readonly channel: vscode.OutputChannel;
  private readonly debugEnabled: boolean;

  constructor(name: string) {
    this.channel = vscode.window.createOutputChannel(name);
    this.debugEnabled = process.env.GIT_ROOM_DEBUG === '1';
  }

  info(message: string): void {
    this.append('INFO', message);
  }

  warn(message: string): void {
    this.append('WARN', message);
  }

  error(message: string, error?: unknown): void {
    const suffix = error instanceof Error ? ` ${error.message}` : '';
    this.append('ERROR', `${message}${suffix}`);
    if (error instanceof Error && error.stack) {
      this.channel.appendLine(error.stack);
    }
  }

  debug(message: string): void {
    if (this.debugEnabled) {
      this.append('DEBUG', message);
    }
  }

  dispose(): void {
    this.channel.dispose();
  }

  private append(level: LogLevel, message: string): void {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[${timestamp}] [${level}] ${message}`);
  }
}
