/**
 * Setup Claude Code hooks for integration with the Hooks platform
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { Command } from 'commander';
import { CONFIG_FILES, type ClaudeHooksConfig, type ClaudeHookEntry } from '@hooks/shared';
import { isProjectInitialized } from '../lib/config.js';
import {
  success,
  error,
  info,
  warn,
  output,
  getOutputFormat,
} from '../lib/output.js';

/** Get the path to the hooks-cli executable */
function getHooksCliPath(): string {
  // In production, this would be the installed path
  // For now, use the current executable or fall back to 'hooks-cli'
  return process.argv[1] ?? 'hooks-cli';
}

/** Get the Claude settings directory path */
function getClaudeSettingsDir(global: boolean, projectPath: string): string {
  if (global) {
    return join(homedir(), CONFIG_FILES.CLAUDE_DIR);
  }
  return join(projectPath, CONFIG_FILES.CLAUDE_DIR);
}

/** Get the Claude settings file path */
function getClaudeSettingsPath(global: boolean, projectPath: string): string {
  return join(getClaudeSettingsDir(global, projectPath), CONFIG_FILES.CLAUDE_SETTINGS);
}

/** Load existing Claude settings */
function loadClaudeSettings(global: boolean, projectPath: string): Record<string, unknown> {
  const settingsPath = getClaudeSettingsPath(global, projectPath);

  if (!existsSync(settingsPath)) {
    return {};
  }

  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Save Claude settings */
function saveClaudeSettings(
  settings: Record<string, unknown>,
  global: boolean,
  projectPath: string
): void {
  const settingsPath = getClaudeSettingsPath(global, projectPath);
  const settingsDir = dirname(settingsPath);

  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

/** Generate the hooks configuration for Claude Code */
function generateHooksConfig(projectPath: string): ClaudeHooksConfig['hooks'] {
  // Use 'hooks-cli' as the command - users should have it in their PATH
  // Or they can edit the generated config to use the full path
  const cli = 'hooks-cli';

  return {
    PreToolUse: [
      {
        matcher: '*',
        hooks: [
          {
            type: 'command',
            command: `${cli} agent-event --event pre-tool --tool "$CLAUDE_TOOL_NAME" -p "${projectPath}"`,
            timeout: 5000,
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: '*',
        hooks: [
          {
            type: 'command',
            command: `${cli} agent-event --event post-tool --tool "$CLAUDE_TOOL_NAME" --status "$CLAUDE_TOOL_EXIT_CODE" -p "${projectPath}"`,
            timeout: 5000,
          },
        ],
      },
    ],
    Stop: [
      {
        matcher: '',
        hooks: [
          {
            type: 'command',
            command: `${cli} agent-event --event stop -p "${projectPath}"`,
            timeout: 5000,
          },
        ],
      },
    ],
  };
}

/** Merge hooks configuration with existing settings */
function mergeHooksConfig(
  existing: Record<string, unknown>,
  newHooks: ClaudeHooksConfig['hooks'],
  overwrite: boolean
): Record<string, unknown> {
  const result = { ...existing };

  if (!result['hooks'] || overwrite) {
    result['hooks'] = newHooks;
  } else {
    // Merge with existing hooks
    const existingHooks = result['hooks'] as Record<string, unknown>;

    for (const [eventType, hookEntries] of Object.entries(newHooks ?? {})) {
      if (!existingHooks[eventType] || overwrite) {
        existingHooks[eventType] = hookEntries;
      } else {
        // Check if we already have hooks-cli entries
        const existing = existingHooks[eventType] as ClaudeHookEntry[];
        const hasHooksCli = existing.some((entry) =>
          entry.hooks?.some((h) => h.command?.includes('hooks-cli'))
        );

        if (!hasHooksCli) {
          // Append our hooks
          existingHooks[eventType] = [...existing, ...(hookEntries as ClaudeHookEntry[])];
        }
      }
    }

    result['hooks'] = existingHooks;
  }

  return result;
}

/** Format hooks config for display */
function formatHooksForDisplay(hooks: ClaudeHooksConfig['hooks']): string {
  const lines: string[] = [];

  for (const [eventType, entries] of Object.entries(hooks ?? {})) {
    lines.push(`  ${eventType}:`);
    for (const entry of entries as ClaudeHookEntry[]) {
      lines.push(`    matcher: "${entry.matcher}"`);
      for (const hook of entry.hooks) {
        lines.push(`    command: ${hook.command}`);
      }
    }
  }

  return lines.join('\n');
}

/** Setup Claude Code hooks command */
export const setupClaudeHooksCommand = new Command('setup-claude-hooks')
  .description('Configure Claude Code hooks for this project')
  .option('-g, --global', 'Configure in global ~/.claude/settings.json')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .option('--dry-run', 'Preview changes without applying')
  .option('--overwrite', 'Overwrite existing hooks configuration')
  .option('--show', 'Show current hooks configuration')
  .option('--remove', 'Remove hooks-cli hooks from configuration')
  .action(async (options: {
    global?: boolean;
    project: string;
    dryRun?: boolean;
    overwrite?: boolean;
    show?: boolean;
    remove?: boolean;
  }) => {
    const projectPath = options.project;
    const isGlobal = options.global ?? false;

    // Show current configuration
    if (options.show) {
      const settings = loadClaudeSettings(isGlobal, projectPath);
      const settingsPath = getClaudeSettingsPath(isGlobal, projectPath);

      if (getOutputFormat() === 'json') {
        output({
          path: settingsPath,
          exists: existsSync(settingsPath),
          hooks: settings['hooks'] ?? null,
        });
      } else {
        console.log();
        info(`Settings file: ${settingsPath}`);

        if (!existsSync(settingsPath)) {
          info('File does not exist yet.');
        } else if (settings['hooks']) {
          console.log('\nCurrent hooks configuration:');
          console.log(formatHooksForDisplay(settings['hooks'] as ClaudeHooksConfig['hooks']));
        } else {
          info('No hooks configured.');
        }
        console.log();
      }
      return;
    }

    // Remove hooks-cli hooks
    if (options.remove) {
      const settings = loadClaudeSettings(isGlobal, projectPath);
      const settingsPath = getClaudeSettingsPath(isGlobal, projectPath);

      if (!settings['hooks']) {
        info('No hooks configured.');
        return;
      }

      const hooks = settings['hooks'] as Record<string, ClaudeHookEntry[]>;
      let modified = false;

      for (const [eventType, entries] of Object.entries(hooks)) {
        const filtered = entries.filter((entry) =>
          !entry.hooks?.some((h) => h.command?.includes('hooks-cli'))
        );

        if (filtered.length !== entries.length) {
          modified = true;
          if (filtered.length === 0) {
            delete hooks[eventType];
          } else {
            hooks[eventType] = filtered;
          }
        }
      }

      if (!modified) {
        info('No hooks-cli hooks found to remove.');
        return;
      }

      if (Object.keys(hooks).length === 0) {
        delete settings['hooks'];
      }

      if (options.dryRun) {
        if (getOutputFormat() === 'json') {
          output({ dryRun: true, settings });
        } else {
          info('Dry run - would remove hooks-cli hooks from:');
          console.log(`  ${settingsPath}`);
        }
      } else {
        saveClaudeSettings(settings, isGlobal, projectPath);
        success('Removed hooks-cli hooks from configuration');
      }
      return;
    }

    // Check if project is initialized (for project-level hooks)
    if (!isGlobal && !isProjectInitialized(projectPath)) {
      warn('Project not initialized. Run `hooks-cli init` first.');
      info('Or use --global to configure global hooks.');

      if (getOutputFormat() !== 'json') {
        console.log();
        info('Proceeding with setup anyway...');
      }
    }

    // Load existing settings
    const existingSettings = loadClaudeSettings(isGlobal, projectPath);
    const settingsPath = getClaudeSettingsPath(isGlobal, projectPath);

    // Generate new hooks config
    const newHooks = generateHooksConfig(projectPath);

    // Merge with existing
    const mergedSettings = mergeHooksConfig(existingSettings, newHooks, options.overwrite ?? false);

    // Check if anything changed
    const existingJson = JSON.stringify(existingSettings);
    const mergedJson = JSON.stringify(mergedSettings);

    if (existingJson === mergedJson) {
      if (getOutputFormat() === 'json') {
        output({ unchanged: true, path: settingsPath });
      } else {
        info('Hooks are already configured. Use --overwrite to replace.');
      }
      return;
    }

    // Dry run - just show what would be done
    if (options.dryRun) {
      if (getOutputFormat() === 'json') {
        output({
          dryRun: true,
          path: settingsPath,
          settings: mergedSettings,
        });
      } else {
        console.log();
        info('Dry run - would write to:');
        console.log(`  ${settingsPath}`);
        console.log();
        console.log('Hooks configuration:');
        console.log(formatHooksForDisplay(mergedSettings['hooks'] as ClaudeHooksConfig['hooks']));
        console.log();
        info('Run without --dry-run to apply changes.');
      }
      return;
    }

    // Save the configuration
    try {
      saveClaudeSettings(mergedSettings, isGlobal, projectPath);

      if (getOutputFormat() === 'json') {
        output({
          success: true,
          path: settingsPath,
          global: isGlobal,
        });
      } else {
        console.log();
        success(`Claude Code hooks configured successfully!`);
        console.log();
        info(`Configuration written to: ${settingsPath}`);
        console.log();
        console.log('The following hooks were added:');
        console.log(formatHooksForDisplay(newHooks));
        console.log();
        info('Claude Code will now report agent activity to the Hooks platform.');

        if (!isGlobal) {
          info('These hooks apply only to this project.');
          info('Use --global to configure hooks for all projects.');
        }
      }
    } catch (err) {
      error('Failed to save configuration', err);
      process.exit(1);
    }
  });
