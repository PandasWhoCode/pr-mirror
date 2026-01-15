import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import type { GitHubAuth } from './types';

/**
 * Log debug message if DEBUG mode is enabled
 */
export function debugLog(message: string): void {
  if (process.env.DEBUG === 'true') {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Execute a shell command and return the output
 */
export function exec(command: string, cwd?: string): string {
  try {
    debugLog(`Executing: ${command}`);
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Execute a shell command and display output to console
 */
export function execVerbose(command: string, cwd?: string): void {
  try {
    debugLog(`Executing: ${command}`);
    execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: 'inherit'
    });
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

/**
 * Get GitHub authentication information
 */
export function getGitHubAuth(): GitHubAuth {
  const token = exec('gh auth token');
  const username = exec('gh api user --jq .login');
  return { token, username };
}

/**
 * Check if GitHub CLI is installed
 */
export function checkGhInstalled(): boolean {
  try {
    exec('which gh');
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up the mirror-repo directory if it exists
 */
export function cleanupMirrorRepo(): void {
  const mirrorRepoPath = join(process.cwd(), 'mirror-repo');
  if (existsSync(mirrorRepoPath)) {
    rmSync(mirrorRepoPath, { recursive: true, force: true });
  }
}

/**
 * Get the mirror-repo path
 */
export function getMirrorRepoPath(): string {
  return join(process.cwd(), 'mirror-repo');
}

