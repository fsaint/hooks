/**
 * Configuration management commands
 */

import { Command } from 'commander';
import {
  loadGlobalConfig,
  saveGlobalConfig,
  loadProjectConfig,
  getGlobalConfigPath,
  getProjectConfigPath,
  isProjectInitialized,
} from '../lib/config.js';
import { success, error, info, output, getOutputFormat } from '../lib/output.js';

export const configCommand = new Command('config')
  .description('Manage configuration');

configCommand
  .command('show')
  .description('Show current configuration')
  .option('-g, --global', 'Show global configuration only')
  .option('-p, --project', 'Show project configuration only')
  .action(async (options: { global?: boolean; project?: boolean }) => {
    const showGlobal = options.global || !options.project;
    const showProject = options.project || !options.global;

    const result: Record<string, unknown> = {};

    if (showGlobal) {
      const globalConfig = loadGlobalConfig();
      // Don't show the actual token value for security
      const safeConfig = {
        ...globalConfig,
        auth: globalConfig.auth?.token
          ? { token: '***' + globalConfig.auth.token.slice(-4) }
          : undefined,
      };

      if (getOutputFormat() === 'json') {
        result['global'] = safeConfig;
      } else {
        console.log('\nGlobal Configuration:');
        console.log(`  Path: ${getGlobalConfigPath()}`);
        console.log(`  Server: ${globalConfig.server.url}`);
        console.log(`  Auth: ${globalConfig.auth?.token ? 'Configured' : 'Not configured'}`);
      }
    }

    if (showProject) {
      const projectPath = process.cwd();
      if (isProjectInitialized(projectPath)) {
        const projectConfig = loadProjectConfig(projectPath);

        if (getOutputFormat() === 'json') {
          result['project'] = projectConfig;
        } else {
          console.log('\nProject Configuration:');
          console.log(`  Path: ${getProjectConfigPath(projectPath)}`);
          console.log(`  Name: ${projectConfig?.project.name}`);
          console.log(`  ID: ${projectConfig?.project.id ?? 'Not registered'}`);
          console.log(`  Runtimes: ${projectConfig?.runtimes?.length ?? 0}`);
          console.log(`  Crons: ${projectConfig?.crons?.length ?? 0}`);
        }
      } else if (getOutputFormat() !== 'json') {
        console.log('\nProject Configuration:');
        console.log('  Not initialized in current directory');
      }
    }

    if (getOutputFormat() === 'json') {
      output(result);
    }

    console.log();
  });

configCommand
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key (e.g., server.url)')
  .argument('<value>', 'Configuration value')
  .option('-g, --global', 'Set in global configuration')
  .action(async (key: string, value: string, options: { global?: boolean }) => {
    const parts = key.split('.');

    if (options.global || parts[0] === 'server' || parts[0] === 'auth') {
      const config = loadGlobalConfig();

      // Handle nested keys
      if (parts[0] === 'server' && parts[1] === 'url') {
        config.server.url = value;
      } else if (parts[0] === 'auth' && parts[1] === 'token') {
        config.auth = { ...config.auth, token: value };
      } else {
        error(`Unknown configuration key: ${key}`);
        info('Available keys: server.url, auth.token');
        process.exit(1);
      }

      saveGlobalConfig(config);
      success(`Set ${key} = ${parts[1] === 'token' ? '***' : value}`);
    } else {
      error('Project configuration editing not yet supported via CLI');
      info('Edit .hooks/config.yaml directly');
      process.exit(1);
    }
  });

configCommand
  .command('get')
  .description('Get a configuration value')
  .argument('<key>', 'Configuration key')
  .action(async (key: string) => {
    const parts = key.split('.');
    const config = loadGlobalConfig();

    let value: unknown;

    if (parts[0] === 'server' && parts[1] === 'url') {
      value = config.server.url;
    } else if (parts[0] === 'auth' && parts[1] === 'token') {
      value = config.auth?.token ? '***' + config.auth.token.slice(-4) : undefined;
    } else {
      error(`Unknown configuration key: ${key}`);
      process.exit(1);
    }

    if (getOutputFormat() === 'json') {
      output({ [key]: value });
    } else {
      console.log(value ?? '(not set)');
    }
  });

configCommand
  .command('path')
  .description('Show configuration file paths')
  .action(async () => {
    const globalPath = getGlobalConfigPath();
    const projectPath = isProjectInitialized()
      ? getProjectConfigPath()
      : null;

    if (getOutputFormat() === 'json') {
      output({
        global: globalPath,
        project: projectPath,
      });
    } else {
      console.log(`Global: ${globalPath}`);
      console.log(`Project: ${projectPath ?? '(not initialized)'}`);
    }
  });
