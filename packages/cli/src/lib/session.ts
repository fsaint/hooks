/**
 * Agent session management for the CLI
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateSessionId, type AgentSession, type ISODateString } from '@hooks/shared';
import { getProjectConfigDir, loadProjectConfig } from './config.js';

/** Session file name */
const SESSION_FILE = 'session.json';

/** Local session data stored in .hooks/session.json */
export interface LocalSession {
  sessionId: string;
  projectPath: string;
  startedAt: ISODateString;
  lastActivityAt: ISODateString;
  toolCalls: number;
  filesModified: string[];
}

/** Get the session file path for a project */
function getSessionFilePath(projectPath: string = process.cwd()): string {
  return join(getProjectConfigDir(projectPath), SESSION_FILE);
}

/** Load the current session for a project */
export function loadSession(projectPath: string = process.cwd()): LocalSession | null {
  const sessionPath = getSessionFilePath(projectPath);

  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    const content = readFileSync(sessionPath, 'utf-8');
    return JSON.parse(content) as LocalSession;
  } catch {
    return null;
  }
}

/** Save a session to the project */
export function saveSession(session: LocalSession, projectPath: string = process.cwd()): void {
  const sessionPath = getSessionFilePath(projectPath);
  const sessionDir = getProjectConfigDir(projectPath);

  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
}

/** Clear the session for a project */
export function clearSession(projectPath: string = process.cwd()): void {
  const sessionPath = getSessionFilePath(projectPath);

  if (existsSync(sessionPath)) {
    const { unlinkSync } = require('node:fs');
    unlinkSync(sessionPath);
  }
}

/** Get or create a session for the current project */
export function getOrCreateSession(projectPath: string = process.cwd()): LocalSession {
  const existing = loadSession(projectPath);

  if (existing) {
    // Check if session is stale (more than 5 minutes since last activity)
    const lastActivity = new Date(existing.lastActivityAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const staleThresholdMs = 5 * 60 * 1000; // 5 minutes

    if (diffMs < staleThresholdMs) {
      return existing;
    }
  }

  // Create a new session
  const now = new Date().toISOString();
  const session: LocalSession = {
    sessionId: generateSessionId(),
    projectPath,
    startedAt: now,
    lastActivityAt: now,
    toolCalls: 0,
    filesModified: [],
  };

  saveSession(session, projectPath);
  return session;
}

/** Update the session's last activity time */
export function touchSession(projectPath: string = process.cwd()): LocalSession | null {
  const session = loadSession(projectPath);
  if (!session) {
    return null;
  }

  session.lastActivityAt = new Date().toISOString();
  saveSession(session, projectPath);
  return session;
}

/** Record a tool call in the session */
export function recordToolCall(
  toolName: string,
  projectPath: string = process.cwd()
): LocalSession | null {
  const session = loadSession(projectPath);
  if (!session) {
    return null;
  }

  session.toolCalls++;
  session.lastActivityAt = new Date().toISOString();

  // Track file modifications for certain tools
  if (toolName === 'Write' || toolName === 'Edit') {
    // File path would need to be passed separately
  }

  saveSession(session, projectPath);
  return session;
}

/** Record a file modification in the session */
export function recordFileModification(
  filePath: string,
  projectPath: string = process.cwd()
): LocalSession | null {
  const session = loadSession(projectPath);
  if (!session) {
    return null;
  }

  if (!session.filesModified.includes(filePath)) {
    session.filesModified.push(filePath);
  }
  session.lastActivityAt = new Date().toISOString();
  saveSession(session, projectPath);
  return session;
}
