/**
 * ID generation utilities
 */

/**
 * Generate a random ID with optional prefix
 * @param prefix - Optional prefix for the ID
 * @returns Generated ID
 */
export function generateId(prefix?: string): string {
  const random = Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  const id = `${timestamp}${random}`.substring(0, 20);
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a project ID
 */
export function generateProjectId(): string {
  return generateId('proj');
}

/**
 * Generate a session ID (for agent sessions)
 */
export function generateSessionId(): string {
  return generateId('sess');
}

/**
 * Generate an event ID
 */
export function generateEventId(): string {
  return generateId('evt');
}

/**
 * Generate a runtime ID
 */
export function generateRuntimeId(): string {
  return generateId('rt');
}

/**
 * Generate a cron job ID
 */
export function generateCronId(): string {
  return generateId('cron');
}

/**
 * Generate an alert ID
 */
export function generateAlertId(): string {
  return generateId('alert');
}

/**
 * Generate an API token ID
 */
export function generateTokenId(): string {
  return generateId('tok');
}
