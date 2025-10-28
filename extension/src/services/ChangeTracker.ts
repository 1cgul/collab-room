import { execFile } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../util/logger';

const execFileAsync = promisify(execFile);

export class ChangeTracker {
  private workspacePath?: string;
  private branch: string;

  constructor(options: { workspacePath?: string; branch: string; logger: Logger }) {
    this.workspacePath = options.workspacePath;
    this.branch = options.branch;
    this.logger = options.logger;
  }

  private readonly logger: Logger;

  setWorkspacePath(workspacePath?: string): void {
    this.workspacePath = workspacePath;
  }

  setBranch(branch: string): void {
    this.branch = branch;
  }

  async getChangedFiles(): Promise<string[]> {
    if (!this.workspacePath) {
      this.logger.warn('No workspace folder detected; skipping git diff.');
      return [];
    }

    try {
      const { stdout } = await execFileAsync(
        'git',
        ['diff', '--name-only', this.branch],
        { cwd: this.workspacePath }
      );

      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => Boolean(line));
    } catch (error) {
      this.logger.error('Failed to read git diff output.', error);
      return [];
    }
  }
}
