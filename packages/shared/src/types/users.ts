/**
 * User and authentication types
 */

import type { ID, ISODateString } from './common.js';

/** User entity */
export interface User {
  id: ID;
  email: string;
  name: string;
  passwordHash?: string; // Not returned in API responses
  avatarUrl?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** API token for CLI/daemon authentication */
export interface ApiToken {
  id: ID;
  userId: ID;
  name: string;
  value: string; // Full token value (hashed in DB)
  scopes: TokenScope[];
  lastUsedAt?: ISODateString;
  expiresAt?: ISODateString;
  createdAt: ISODateString;
}

/** Token scopes */
export type TokenScope =
  | '*'
  | 'projects:read'
  | 'projects:write'
  | 'agents:read'
  | 'agents:write'
  | 'runtimes:read'
  | 'runtimes:write'
  | 'crons:read'
  | 'crons:write'
  | 'alerts:read'
  | 'alerts:write';

/** Login request */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Login response */
export interface LoginResponse {
  user: User;
  token: string;
  expiresAt: ISODateString;
}

/** Create API token request */
export interface CreateApiTokenRequest {
  name: string;
  scopes: TokenScope[];
  expiresAt?: ISODateString;
}

/** Create API token response (only time full token is shown) */
export interface CreateApiTokenResponse {
  token: ApiToken;
  secret: string; // Full token, only shown once
}
