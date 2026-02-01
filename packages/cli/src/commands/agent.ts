/**
 * Agent monitoring commands
 */

import { Command } from 'commander';
import {
  API_PATHS,
  type AgentEventType,
  type CreateAgentEventRequest,
  type AgentSession,
  type AgentSessionWithEvents,
  type AgentEvent,
  formatDuration,
} from '@hooks/shared';
import { loadProjectConfig, isProjectInitialized } from '../lib/config.js';
import { getApiClient, ApiClientError } from '../lib/api-client.js';
import {
  getOrCreateSession,
  loadSession,
  clearSession,
  recordToolCall,
  recordFileModification,
} from '../lib/session.js';
import { enqueueEvent, getPendingEvents, dequeueEvent } from '../lib/event-queue.js';
import {
  success,
  error,
  info,
  warn,
  output,
  getOutputFormat,
  formatStatus,
  formatKeyValue,
  formatRelativeTime,
  formatRow,
} from '../lib/output.js';

/** Map CLI event type to API event type */
function mapEventType(event: string): AgentEventType {
  const mapping: Record<string, AgentEventType> = {
    'pre-tool': 'tool_use',
    'post-tool': 'tool_result',
    'tool-error': 'error',
    'start': 'session_start',
    'stop': 'session_end',
    'notification': 'notification',
    'heartbeat': 'heartbeat',
  };

  return mapping[event] ?? (event as AgentEventType);
}

/** Report an agent event */
export const agentEventCommand = new Command('agent-event')
  .description('Report an agent event (used by Claude Code hooks)')
  .option('--event <type>', 'Event type (pre-tool, post-tool, tool-error, start, stop, notification)')
  .option('--tool <name>', 'Tool name')
  .option('--status <code>', 'Exit status code')
  .option('--message <msg>', 'Event message')
  .option('--file <path>', 'File path (for file modification tracking)')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(async (options: {
    event?: string;
    tool?: string;
    status?: string;
    message?: string;
    file?: string;
    project: string;
  }) => {
    const projectPath = options.project;

    // Validate event type
    if (!options.event) {
      error('Event type is required. Use --event <type>');
      process.exit(1);
    }

    // Get or create session
    const session = getOrCreateSession(projectPath);

    // Track tool calls and file modifications locally
    if (options.tool) {
      recordToolCall(options.tool, projectPath);
    }
    if (options.file) {
      recordFileModification(options.file, projectPath);
    }

    // Build the event request
    const eventRequest: CreateAgentEventRequest = {
      sessionId: session.sessionId,
      projectPath,
      type: mapEventType(options.event),
      toolName: options.tool,
      message: options.message,
      exitCode: options.status ? parseInt(options.status, 10) : undefined,
    };

    // Try to send to server
    const client = getApiClient();

    if (!client.isAuthenticated()) {
      // Queue for later
      enqueueEvent('agent', eventRequest);

      if (getOutputFormat() === 'json') {
        output({ queued: true, sessionId: session.sessionId });
      }
      return;
    }

    try {
      const result = await client.post<{ eventId: string }>(
        API_PATHS.AGENT_EVENTS,
        eventRequest
      );

      if (getOutputFormat() === 'json') {
        output({ success: true, eventId: result.eventId, sessionId: session.sessionId });
      }

      // If this was a stop event, clear the local session
      if (options.event === 'stop') {
        clearSession(projectPath);
      }
    } catch (err) {
      // Queue the event for later sync
      enqueueEvent('agent', eventRequest);

      if (err instanceof ApiClientError) {
        // Don't fail loudly for hooks - just queue and continue
        if (getOutputFormat() === 'json') {
          output({ queued: true, sessionId: session.sessionId, error: err.message });
        }
      }
    }
  });

/** Show agent status */
export const agentStatusCommand = new Command('agent-status')
  .description('Show current agent session status')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(async (options: { project: string }) => {
    const projectPath = options.project;

    // Check local session first
    const localSession = loadSession(projectPath);

    if (!localSession) {
      if (getOutputFormat() === 'json') {
        output({ active: false });
      } else {
        info('No active agent session in this project.');
      }
      return;
    }

    // Try to get server status if registered
    const config = loadProjectConfig(projectPath);
    const client = getApiClient();

    if (config?.project.id && client.isAuthenticated()) {
      try {
        const session = await client.get<AgentSessionWithEvents>(
          API_PATHS.AGENT(localSession.sessionId)
        );

        if (getOutputFormat() === 'json') {
          output(session);
        } else {
          console.log();
          console.log(formatKeyValue('Session ID', session.id));
          console.log(formatKeyValue('Status', formatStatus(session.status)));
          console.log(formatKeyValue('Started', formatRelativeTime(session.startedAt)));
          console.log(formatKeyValue('Last Activity', formatRelativeTime(session.lastActivityAt)));

          if (session.recentEvents.length > 0) {
            console.log();
            console.log('Recent Events:');
            for (const event of session.recentEvents.slice(0, 5)) {
              const time = formatRelativeTime(event.timestamp);
              console.log(`  ${time}: ${event.type}`);
            }
          }
          console.log();
        }
        return;
      } catch {
        // Fall back to local session info
      }
    }

    // Display local session info
    if (getOutputFormat() === 'json') {
      output({
        active: true,
        local: true,
        ...localSession,
      });
    } else {
      console.log();
      console.log(formatKeyValue('Session ID', localSession.sessionId));
      console.log(formatKeyValue('Status', formatStatus('active')));
      console.log(formatKeyValue('Started', formatRelativeTime(localSession.startedAt)));
      console.log(formatKeyValue('Last Activity', formatRelativeTime(localSession.lastActivityAt)));
      console.log(formatKeyValue('Tool Calls', localSession.toolCalls.toString()));
      console.log(formatKeyValue('Files Modified', localSession.filesModified.length.toString()));
      if (!config?.project.id) {
        warn('Project not registered - showing local data only');
      }
      console.log();
    }
  });

/** List active agents */
export const agentListCommand = new Command('agent-list')
  .description('List active agent sessions')
  .option('--all', 'Show all sessions (including completed)')
  .option('--limit <n>', 'Maximum number of sessions to show', '10')
  .action(async (options: { all?: boolean; limit: string }) => {
    const client = getApiClient();

    if (!client.isAuthenticated()) {
      error('Not authenticated. Run `hooks-cli login` first.');
      info('Or use `hooks-cli agent-status` for local session info.');
      process.exit(1);
    }

    try {
      // Get all projects first, then aggregate agents
      const projects = await client.get<Array<{ id: string; name: string }>>(API_PATHS.PROJECTS);

      const allSessions: Array<AgentSession & { projectName: string }> = [];

      for (const project of projects) {
        try {
          const sessions = await client.get<AgentSession[]>(
            API_PATHS.PROJECT_AGENTS(project.id)
          );
          for (const session of sessions) {
            if (options.all || session.status === 'active' || session.status === 'idle') {
              allSessions.push({ ...session, projectName: project.name });
            }
          }
        } catch {
          // Skip projects we can't access
        }
      }

      // Sort by last activity (most recent first)
      allSessions.sort((a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );

      // Apply limit
      const limit = parseInt(options.limit, 10);
      const sessions = allSessions.slice(0, limit);

      if (getOutputFormat() === 'json') {
        output(sessions);
      } else {
        if (sessions.length === 0) {
          info('No active agent sessions found.');
          return;
        }

        console.log();
        const header = formatRow(
          ['PROJECT', 'STATUS', 'LAST ACTIVITY'],
          [25, 12, 20]
        );
        console.log(header);
        console.log('-'.repeat(60));

        for (const session of sessions) {
          const row = formatRow(
            [
              session.projectName.slice(0, 23),
              formatStatus(session.status),
              formatRelativeTime(session.lastActivityAt),
            ],
            [25, 12, 20]
          );
          console.log(row);
        }
        console.log();

        if (allSessions.length > limit) {
          info(`Showing ${limit} of ${allSessions.length} sessions. Use --limit to see more.`);
        }
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        error(`Failed to list agents: ${err.message}`);
      } else {
        error('Failed to list agents');
      }
      process.exit(1);
    }
  });

/** Sync queued events */
export const agentSyncCommand = new Command('agent-sync')
  .description('Sync queued agent events to the server')
  .action(async () => {
    const client = getApiClient();

    if (!client.isAuthenticated()) {
      error('Not authenticated. Run `hooks-cli login` first.');
      process.exit(1);
    }

    const pendingEvents = getPendingEvents('agent');

    if (pendingEvents.length === 0) {
      if (getOutputFormat() === 'json') {
        output({ synced: 0 });
      } else {
        info('No pending events to sync.');
      }
      return;
    }

    let synced = 0;
    let failed = 0;

    for (const event of pendingEvents) {
      try {
        await client.post(API_PATHS.AGENT_EVENTS, event.payload);
        dequeueEvent(event.id);
        synced++;
      } catch {
        failed++;
      }
    }

    if (getOutputFormat() === 'json') {
      output({ synced, failed, remaining: pendingEvents.length - synced });
    } else {
      success(`Synced ${synced} events`);
      if (failed > 0) {
        warn(`${failed} events failed to sync and will be retried later.`);
      }
    }
  });
