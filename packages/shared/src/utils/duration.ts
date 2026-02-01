/**
 * Duration parsing and formatting utilities
 */

/** Duration units in milliseconds */
const UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/**
 * Parse a duration string (e.g., "30s", "5m", "1h") to milliseconds
 * @param duration - Duration string like "30s", "5m", "1h30m"
 * @returns Duration in milliseconds
 */
export function parseDuration(duration: string): number {
  const regex = /(\d+)(ms|s|m|h|d)/g;
  let total = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(duration)) !== null) {
    const value = parseInt(match[1] ?? '0', 10);
    const unit = match[2] ?? 'ms';
    const multiplier = UNITS[unit];
    if (multiplier !== undefined) {
      total += value * multiplier;
    }
  }

  return total;
}

/**
 * Format milliseconds as a human-readable duration
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Format milliseconds as a short duration (e.g., for response times)
 * @param ms - Duration in milliseconds
 * @returns Short formatted duration
 */
export function formatShortDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${(ms / 60000).toFixed(1)}m`;
}
