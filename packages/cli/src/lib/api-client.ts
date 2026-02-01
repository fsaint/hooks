/**
 * HTTP API client for communicating with the Hooks server
 */

import { API_PATHS, type ApiResponse, type ApiError } from '@hooks/shared';
import { getServerUrl, getAuthToken } from './config.js';

/** API client options */
export interface ApiClientOptions {
  serverUrl?: string;
  token?: string;
  timeout?: number;
}

/** API request options */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

/** API client error */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  static fromApiError(error: ApiError, statusCode?: number): ApiClientError {
    return new ApiClientError(error.message, error.code, statusCode, error.details);
  }
}

/** API client for the Hooks server */
export class ApiClient {
  private readonly serverUrl: string;
  private readonly token?: string;
  private readonly timeout: number;

  constructor(options: ApiClientOptions = {}) {
    this.serverUrl = options.serverUrl ?? getServerUrl();
    const token = options.token ?? getAuthToken();
    this.token = token;
    this.timeout = options.timeout ?? 30000;
  }

  /** Make an HTTP request */
  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.serverUrl}${path}`;
    const method = options.method ?? 'GET';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout ?? this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (options.body !== undefined) {
        fetchOptions.body = JSON.stringify(options.body);
      }
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      const data = (await response.json()) as ApiResponse<T>;

      if (!response.ok || !data.success) {
        const error = data.error ?? {
          code: 'UNKNOWN_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
        throw ApiClientError.fromApiError(error, response.status);
      }

      return data.data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiClientError('Request timed out', 'TIMEOUT');
        }
        throw new ApiClientError(error.message, 'NETWORK_ERROR');
      }

      throw new ApiClientError('Unknown error', 'UNKNOWN_ERROR');
    }
  }

  /** GET request */
  async get<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /** POST request */
  async post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  /** PUT request */
  async put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  /** DELETE request */
  async delete<T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  /** Check if the client is authenticated */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /** Get the server URL */
  getServerUrl(): string {
    return this.serverUrl;
  }
}

/** Singleton API client instance */
let defaultClient: ApiClient | null = null;

/** Get the default API client */
export function getApiClient(): ApiClient {
  if (!defaultClient) {
    defaultClient = new ApiClient();
  }
  return defaultClient;
}

/** Create a new API client with custom options */
export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}

/** Reset the default client (for testing or reconfiguration) */
export function resetApiClient(): void {
  defaultClient = null;
}
