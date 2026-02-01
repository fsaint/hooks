/**
 * PID file management for the daemon
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getPidFilePath } from './config.js';

/** Check if a process with the given PID is running */
export function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Read the PID from the PID file */
export function readPidFile(): number | null {
  const pidFile = getPidFilePath();

  if (!existsSync(pidFile)) {
    return null;
  }

  try {
    const content = readFileSync(pidFile, 'utf-8').trim();
    const pid = parseInt(content, 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/** Write the current process PID to the PID file */
export function writePidFile(): void {
  const pidFile = getPidFilePath();
  const pidDir = dirname(pidFile);

  if (!existsSync(pidDir)) {
    mkdirSync(pidDir, { recursive: true });
  }

  writeFileSync(pidFile, process.pid.toString(), 'utf-8');
}

/** Remove the PID file */
export function removePidFile(): void {
  const pidFile = getPidFilePath();

  if (existsSync(pidFile)) {
    try {
      unlinkSync(pidFile);
    } catch {
      // Ignore errors
    }
  }
}

/** Check if the daemon is already running */
export function isDaemonRunning(): { running: boolean; pid?: number } {
  const pid = readPidFile();

  if (pid === null) {
    return { running: false };
  }

  if (isProcessRunning(pid)) {
    return { running: true, pid };
  }

  // PID file exists but process is not running - clean up stale PID file
  removePidFile();
  return { running: false };
}

/** Acquire the PID file (fails if daemon is already running) */
export function acquirePidFile(): boolean {
  const status = isDaemonRunning();

  if (status.running) {
    return false;
  }

  writePidFile();
  return true;
}
