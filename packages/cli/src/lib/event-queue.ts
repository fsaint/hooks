/**
 * Local event queue for offline support
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  generateEventId,
  DEFAULTS,
  type CreateAgentEventRequest,
  type ReportCronEventRequest,
  type ReportRuntimeStatusRequest,
} from '@hooks/shared';
import { getGlobalConfigDir } from './config.js';

/** Queue file name */
const QUEUE_FILE = 'event-queue.json';

/** Event payload types */
export type EventPayload =
  | CreateAgentEventRequest
  | ReportCronEventRequest
  | ReportRuntimeStatusRequest;

/** Queued event with metadata */
export interface QueuedEvent {
  id: string;
  type: 'agent' | 'cron' | 'runtime';
  payload: EventPayload;
  createdAt: string;
  retryCount: number;
}

/** Event queue data structure */
interface EventQueueData {
  events: QueuedEvent[];
  lastSyncAt?: string;
}

/** Get the event queue file path */
function getQueueFilePath(): string {
  return join(getGlobalConfigDir(), QUEUE_FILE);
}

/** Load the event queue */
export function loadEventQueue(): EventQueueData {
  const queuePath = getQueueFilePath();

  if (!existsSync(queuePath)) {
    return { events: [] };
  }

  try {
    const content = readFileSync(queuePath, 'utf-8');
    return JSON.parse(content) as EventQueueData;
  } catch {
    return { events: [] };
  }
}

/** Save the event queue */
export function saveEventQueue(data: EventQueueData): void {
  const queuePath = getQueueFilePath();
  const queueDir = getGlobalConfigDir();

  if (!existsSync(queueDir)) {
    mkdirSync(queueDir, { recursive: true });
  }

  writeFileSync(queuePath, JSON.stringify(data, null, 2), 'utf-8');
}

/** Add an event to the queue */
export function enqueueEvent(
  type: QueuedEvent['type'],
  payload: EventPayload
): QueuedEvent {
  const queue = loadEventQueue();

  // Enforce max queue size
  if (queue.events.length >= DEFAULTS.EVENT_QUEUE_MAX_SIZE) {
    // Remove oldest events
    queue.events = queue.events.slice(-DEFAULTS.EVENT_QUEUE_MAX_SIZE + 1);
  }

  const event: QueuedEvent = {
    id: generateEventId(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  queue.events.push(event);
  saveEventQueue(queue);

  return event;
}

/** Get pending events from the queue */
export function getPendingEvents(type?: QueuedEvent['type']): QueuedEvent[] {
  const queue = loadEventQueue();

  if (type) {
    return queue.events.filter((e) => e.type === type);
  }

  return queue.events;
}

/** Remove an event from the queue (after successful sync) */
export function dequeueEvent(eventId: string): boolean {
  const queue = loadEventQueue();
  const initialLength = queue.events.length;

  queue.events = queue.events.filter((e) => e.id !== eventId);

  if (queue.events.length < initialLength) {
    saveEventQueue(queue);
    return true;
  }

  return false;
}

/** Remove multiple events from the queue */
export function dequeueEvents(eventIds: string[]): number {
  const queue = loadEventQueue();
  const initialLength = queue.events.length;

  const idSet = new Set(eventIds);
  queue.events = queue.events.filter((e) => !idSet.has(e.id));

  const removed = initialLength - queue.events.length;
  if (removed > 0) {
    saveEventQueue(queue);
  }

  return removed;
}

/** Increment retry count for an event */
export function incrementRetryCount(eventId: string): void {
  const queue = loadEventQueue();
  const event = queue.events.find((e) => e.id === eventId);

  if (event) {
    event.retryCount++;
    saveEventQueue(queue);
  }
}

/** Get queue statistics */
export function getQueueStats(): {
  total: number;
  byType: Record<string, number>;
  oldestEvent?: string;
} {
  const queue = loadEventQueue();

  const byType: Record<string, number> = {};
  for (const event of queue.events) {
    byType[event.type] = (byType[event.type] ?? 0) + 1;
  }

  return {
    total: queue.events.length,
    byType,
    oldestEvent: queue.events[0]?.createdAt,
  };
}

/** Clear the entire queue */
export function clearEventQueue(): void {
  saveEventQueue({ events: [] });
}

/** Update last sync timestamp */
export function updateLastSyncTime(): void {
  const queue = loadEventQueue();
  queue.lastSyncAt = new Date().toISOString();
  saveEventQueue(queue);
}
