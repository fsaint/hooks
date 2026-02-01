#!/usr/bin/env node

/**
 * Hooks CLI - Command line tool for the Hooks monitoring platform
 */

import { Command } from 'commander';
import { VERSION } from '@hooks/shared';
import { setOutputFormat, setQuietMode } from './lib/output.js';
import {
  initCommand,
  registerCommand,
  statusCommand,
  loginCommand,
  logoutCommand,
  configCommand,
  agentEventCommand,
  agentStatusCommand,
  agentListCommand,
  agentSyncCommand,
  cronWrapCommand,
  cronStartCommand,
  cronEndCommand,
  cronHeartbeatCommand,
  cronStatusCommand,
  cronHistoryCommand,
  setupClaudeHooksCommand,
} from './commands/index.js';

const program = new Command();

program
  .name('hooks-cli')
  .description('CLI for the Hooks monitoring platform')
  .version(VERSION)
  .option('--json', 'Output in JSON format')
  .option('-q, --quiet', 'Suppress non-essential output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts() as { json?: boolean; quiet?: boolean };
    if (opts.json) {
      setOutputFormat('json');
    }
    if (opts.quiet) {
      setQuietMode(true);
    }
  });

// Project commands
program.addCommand(initCommand);
program.addCommand(registerCommand);
program.addCommand(statusCommand);

// Auth commands
program.addCommand(loginCommand);
program.addCommand(logoutCommand);

// Config commands
program.addCommand(configCommand);

// Agent commands
program.addCommand(agentEventCommand);
program.addCommand(agentStatusCommand);
program.addCommand(agentListCommand);
program.addCommand(agentSyncCommand);

// Cron commands
program.addCommand(cronWrapCommand);
program.addCommand(cronStartCommand);
program.addCommand(cronEndCommand);
program.addCommand(cronHeartbeatCommand);
program.addCommand(cronStatusCommand);
program.addCommand(cronHistoryCommand);

// Claude Code integration
program.addCommand(setupClaudeHooksCommand);

// Utility commands
program
  .command('dashboard')
  .description('Open the web dashboard')
  .action(() => {
    console.log('Dashboard command will open the web UI');
  });

// Parse and execute
program.parse();
