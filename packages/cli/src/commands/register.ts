/**
 * Register project with the Hooks server
 */

import { Command } from 'commander';
import { API_PATHS, type Project, type CreateProjectRequest } from '@hooks/shared';
import {
  loadProjectConfig,
  saveProjectConfig,
  isProjectInitialized,
} from '../lib/config.js';
import { getApiClient, ApiClientError } from '../lib/api-client.js';
import { success, error, info, warn, output, getOutputFormat } from '../lib/output.js';

export const registerCommand = new Command('register')
  .description('Register the project with the Hooks server')
  .option('-f, --force', 'Re-register even if already registered')
  .action(async (options: { force?: boolean }) => {
    const projectPath = process.cwd();

    // Check if initialized
    if (!isProjectInitialized(projectPath)) {
      error('Project not initialized. Run `hooks-cli init` first.');
      process.exit(1);
    }

    const config = loadProjectConfig(projectPath);
    if (!config) {
      error('Failed to load project configuration');
      process.exit(1);
    }

    // Check if already registered
    if (config.project.id && !options.force) {
      warn(`Project already registered with ID: ${config.project.id}`);
      info('Use --force to re-register.');
      return;
    }

    const client = getApiClient();

    // Check authentication
    if (!client.isAuthenticated()) {
      error('Not authenticated. Run `hooks-cli login` first.');
      process.exit(1);
    }

    try {
      const request: CreateProjectRequest = {
        name: config.project.name,
        path: projectPath,
      };

      const project = await client.post<Project>(API_PATHS.PROJECTS, request);

      // Update local config with server-assigned ID
      config.project.id = project.id;
      saveProjectConfig(config, projectPath);

      if (getOutputFormat() === 'json') {
        output(project);
      } else {
        success(`Project registered with ID: ${project.id}`);
        info(`Server URL: ${client.getServerUrl()}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        error(`Registration failed: ${err.message}`, { code: err.code });
      } else {
        error('Registration failed', err);
      }
      process.exit(1);
    }
  });
