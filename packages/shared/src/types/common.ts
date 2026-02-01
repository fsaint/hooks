/**
 * Common types used across the Hooks platform
 */

/** ISO 8601 date string */
export type ISODateString = string;

/** Unique identifier */
export type ID = string;

/** Pagination parameters */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/** Standard API error response */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
