/**
 * Authentication commands
 */

import { Command } from 'commander';
import { createInterface } from 'node:readline';
import { API_PATHS, type User, type LoginResponse } from '@hooks/shared';
import {
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  loadGlobalConfig,
  saveGlobalConfig,
} from '../lib/config.js';
import { createApiClient, ApiClientError } from '../lib/api-client.js';
import { success, error, info, output, getOutputFormat } from '../lib/output.js';

/** Prompt for user input */
async function prompt(question: string, hidden = false): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      // For password input, we'd ideally hide the input
      // This is a simplified version
      process.stdout.write(question);
      rl.question('', (answer) => {
        rl.close();
        resolve(answer);
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

export const loginCommand = new Command('login')
  .description('Authenticate with the Hooks server')
  .option('-t, --token <token>', 'API token (for non-interactive login)')
  .option('-s, --server <url>', 'Server URL')
  .action(async (options: { token?: string; server?: string }) => {
    // Update server URL if provided
    if (options.server) {
      const config = loadGlobalConfig();
      config.server.url = options.server;
      saveGlobalConfig(config);
      info(`Server URL set to: ${options.server}`);
    }

    // If token provided directly, save it
    if (options.token) {
      setAuthToken(options.token);

      // Verify the token works
      const client = createApiClient({ token: options.token });
      try {
        const user = await client.get<User>(API_PATHS.AUTH_ME);
        if (getOutputFormat() === 'json') {
          output({ success: true, user });
        } else {
          success(`Logged in as ${user.name} (${user.email})`);
        }
      } catch (err) {
        clearAuthToken();
        if (err instanceof ApiClientError) {
          error(`Authentication failed: ${err.message}`);
        } else {
          error('Authentication failed');
        }
        process.exit(1);
      }
      return;
    }

    // Interactive login
    info('Enter your credentials to authenticate with the Hooks server.');
    info('Alternatively, use --token to provide an API token.\n');

    const email = await prompt('Email: ');
    const password = await prompt('Password: ', true);
    console.log(); // New line after password

    const client = createApiClient({});

    try {
      const response = await client.post<LoginResponse>(API_PATHS.AUTH_LOGIN, {
        email,
        password,
      });

      setAuthToken(response.token);

      if (getOutputFormat() === 'json') {
        output({ success: true, user: response.user });
      } else {
        success(`Logged in as ${response.user.name}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        error(`Login failed: ${err.message}`);
      } else {
        error('Login failed');
      }
      process.exit(1);
    }
  });

export const logoutCommand = new Command('logout')
  .description('Clear authentication credentials')
  .action(async () => {
    const token = getAuthToken();

    if (!token) {
      info('Not currently logged in.');
      return;
    }

    // Optionally invalidate token on server
    try {
      const client = createApiClient({ token });
      await client.post(API_PATHS.AUTH_LOGOUT);
    } catch {
      // Ignore errors - we'll clear locally anyway
    }

    clearAuthToken();

    if (getOutputFormat() === 'json') {
      output({ success: true });
    } else {
      success('Logged out successfully');
    }
  });
