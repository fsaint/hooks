/**
 * Output formatting utilities for the CLI
 */

import chalk from 'chalk';

/** Output format */
export type OutputFormat = 'text' | 'json';

/** Global output configuration */
let outputFormat: OutputFormat = 'text';
let quietMode = false;

/** Set the output format */
export function setOutputFormat(format: OutputFormat): void {
  outputFormat = format;
}

/** Get the current output format */
export function getOutputFormat(): OutputFormat {
  return outputFormat;
}

/** Set quiet mode */
export function setQuietMode(quiet: boolean): void {
  quietMode = quiet;
}

/** Check if in quiet mode */
export function isQuietMode(): boolean {
  return quietMode;
}

/** Output data (respects format setting) */
export function output(data: unknown): void {
  if (quietMode && outputFormat !== 'json') {
    return;
  }

  if (outputFormat === 'json') {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(data);
  }
}

/** Output a success message */
export function success(message: string): void {
  if (quietMode) return;

  if (outputFormat === 'json') {
    console.log(JSON.stringify({ success: true, message }));
  } else {
    console.log(chalk.green('✓'), message);
  }
}

/** Output an error message */
export function error(message: string, details?: unknown): void {
  if (outputFormat === 'json') {
    console.error(JSON.stringify({ success: false, error: message, details }));
  } else {
    console.error(chalk.red('✗'), message);
    if (details && !quietMode) {
      console.error(chalk.gray('  Details:'), details);
    }
  }
}

/** Output a warning message */
export function warn(message: string): void {
  if (quietMode) return;

  if (outputFormat === 'json') {
    console.log(JSON.stringify({ warning: message }));
  } else {
    console.log(chalk.yellow('⚠'), message);
  }
}

/** Output an info message */
export function info(message: string): void {
  if (quietMode) return;

  if (outputFormat === 'json') {
    // Info messages are typically not output in JSON mode
    return;
  }
  console.log(chalk.blue('ℹ'), message);
}

/** Output a debug message (only in verbose mode) */
export function debug(message: string): void {
  if (process.env['HOOKS_DEBUG']) {
    console.log(chalk.gray('[debug]'), message);
  }
}

/** Format a key-value pair for display */
export function formatKeyValue(key: string, value: unknown): string {
  return `${chalk.gray(key + ':')} ${value}`;
}

/** Format a table row */
export function formatRow(columns: string[], widths: number[]): string {
  return columns
    .map((col, i) => {
      const width = widths[i] ?? 20;
      return col.padEnd(width);
    })
    .join('  ');
}

/** Format a status badge */
export function formatStatus(
  status: 'healthy' | 'unhealthy' | 'active' | 'idle' | 'completed' | 'error' | 'unknown' | string
): string {
  switch (status) {
    case 'healthy':
    case 'active':
    case 'completed':
      return chalk.green(status);
    case 'unhealthy':
    case 'error':
      return chalk.red(status);
    case 'idle':
    case 'unknown':
      return chalk.yellow(status);
    default:
      return chalk.gray(status);
  }
}

/** Format a timestamp */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

/** Format a relative time */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay}d ago`;
  }
  if (diffHour > 0) {
    return `${diffHour}h ago`;
  }
  if (diffMin > 0) {
    return `${diffMin}m ago`;
  }
  return 'just now';
}

/** Create a simple spinner for long operations */
export function createSpinner(message: string): { stop: (success?: boolean) => void } {
  if (quietMode || outputFormat === 'json') {
    return { stop: () => {} };
  }

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;

  process.stdout.write(`${frames[0]} ${message}`);

  const interval = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${frames[i]} ${message}`);
  }, 80);

  return {
    stop: (succeeded = true) => {
      clearInterval(interval);
      const icon = succeeded ? chalk.green('✓') : chalk.red('✗');
      process.stdout.write(`\r${icon} ${message}\n`);
    },
  };
}
