/**
 * Initialize hooks in a project
 */

import { basename } from 'node:path';
import { Command } from 'commander';
import {
  isProjectInitialized,
  saveProjectConfig,
  getProjectConfigDir,
} from '../lib/config.js';
import { success, error, info, warn } from '../lib/output.js';
import type { LocalProjectConfig } from '@hooks/shared';

export const initCommand = new Command('init')
  .description('Initialize hooks in the current project')
  .option('-n, --name <name>', 'Project name')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('--no-register', 'Skip server registration')
  .action(async (options: { name?: string; force?: boolean; register?: boolean }) => {
    const projectPath = process.cwd();

    // Check if already initialized
    if (isProjectInitialized(projectPath) && !options.force) {
      warn('Project already initialized. Use --force to overwrite.');
      info(`Config location: ${getProjectConfigDir(projectPath)}`);
      return;
    }

    // Create project config
    const projectName = options.name ?? basename(projectPath);

    const config: LocalProjectConfig = {
      project: {
        name: projectName,
      },
      runtimes: [],
      crons: [],
    };

    try {
      saveProjectConfig(config, projectPath);
      success(`Initialized hooks for project "${projectName}"`);
      info(`Config created at: ${getProjectConfigDir(projectPath)}/config.yaml`);

      if (options.register !== false) {
        info('Run `hooks-cli register` to register this project with the server.');
      }
    } catch (err) {
      error('Failed to initialize project', err);
      process.exit(1);
    }
  });
