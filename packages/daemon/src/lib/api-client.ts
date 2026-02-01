/**
 * API client for reporting health check results
 */

import { API_PATHS, type ReportRuntimeStatusRequest } from '@hooks/shared';
import { getServerUrl, getAuthToken } from './config.js';
import { createLogger } from './logger.js';

const log = createLogger('api');

/** API client for the daemon */
export class ApiClient {
  private readonly serverUrl: string;
  private readonly token?: string;
  private readonly timeout: number;

  constructor(options: { serverUrl?: string; token?: string; timeout?: number } = {}) {
    this.serverUrl = options.serverUrl ?? getServerUrl();
    const token = options.token ?? getAuthToken();
    this.token = token;
    this.timeout = options.timeout ?? 10000;
  }

  /** Check if client is authenticated */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /** Report runtime status */
  async reportRuntimeStatus(request: ReportRuntimeStatusRequest): Promise<boolean> {
    if (!this.isAuthenticated()) {
      log.debug('Not authenticated, skipping status report');
      return false;
    }

    const url = `${this.serverUrl}${API_PATHS.RUNTIME_STATUS}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        log.warn(`Failed to report status: HTTP ${response.status}`);
        return false;
      }

      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        log.warn('Request timed out');
      } else {
        log.debug('Failed to report status', err);
      }
      return false;
    }
  }
}

/** Singleton instance */
let defaultClient: ApiClient | null = null;

/** Get the default API client */
export function getApiClient(): ApiClient {
  if (!defaultClient) {
    defaultClient = new ApiClient();
  }
  return defaultClient;
}

/** Reset the client (for reconfiguration) */
export function resetApiClient(): void {
  defaultClient = null;
}
