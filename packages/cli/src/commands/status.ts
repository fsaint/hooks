/**
 * Show project status
 */

import { Command } from 'commander';
import { API_PATHS, type ProjectWithStatus } from '@hooks/shared';
import { loadProjectConfig, isProjectInitialized } from '../lib/config.js';
import { getApiClient, ApiClientError } from '../lib/api-client.js';
import {
  success,
  error,
  info,
  output,
  getOutputFormat,
  formatStatus,
  formatKeyValue,
} from '../lib/output.js';

export const statusCommand = new Command('status')
  .description('Show project status')
  .option('-p, --project <path>', 'Project path', process.cwd())
  .action(async (options: { project: string }) => {
    const projectPath = options.project;

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

    // If not registered, show local config only
    if (!config.project.id) {
      if (getOutputFormat() === 'json') {
        output({
          name: config.project.name,
          registered: false,
          runtimes: config.runtimes?.length ?? 0,
          crons: config.crons?.length ?? 0,
        });
      } else {
        info(`Project: ${config.project.name}`);
        info('Status: Not registered with server');
        info(`Runtimes configured: ${config.runtimes?.length ?? 0}`);
        info(`Crons configured: ${config.crons?.length ?? 0}`);
        info('Run `hooks-cli register` to register with the server.');
      }
      return;
    }

    const client = getApiClient();

    try {
      const project = await client.get<ProjectWithStatus>(
        API_PATHS.PROJECT(config.project.id)
      );

      if (getOutputFormat() === 'json') {
        output(project);
      } else {
        console.log();
        console.log(formatKeyValue('Project', project.name));
        console.log(formatKeyValue('ID', project.id));
        console.log(formatKeyValue('Status', formatStatus(project.status)));
        console.log();
        console.log(formatKeyValue('Agents', `${project.activeAgents}/${project.agentCount} active`));
        console.log(
          formatKeyValue(
            'Runtimes',
            `${project.healthyRuntimes}/${project.runtimeCount} healthy`
          )
        );
        console.log(
          formatKeyValue(
            'Crons',
            project.failedCrons > 0
              ? `${project.failedCrons} failed`
              : `${project.cronCount} configured`
          )
        );
        console.log();
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 404) {
          error('Project not found on server. It may have been deleted.');
          info('Run `hooks-cli register --force` to re-register.');
        } else {
          error(`Failed to get status: ${err.message}`);
        }
      } else {
        error('Failed to get status', err);
      }
      process.exit(1);
    }
  });
