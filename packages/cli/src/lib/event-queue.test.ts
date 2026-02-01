/**
 * Event queue tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock the config module to use a test directory
vi.mock('./config.js', () => ({
  getGlobalConfigDir: () => {
    const testDir = path.join(os.tmpdir(), 'hooks-test-' + process.pid);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    return testDir;
  },
}));

// Import after mocking
import {
  loadEventQueue,
  saveEventQueue,
  enqueueEvent,
  getPendingEvents,
  dequeueEvent,
  dequeueEvents,
  incrementRetryCount,
  getQueueStats,
  clearEventQueue,
} from './event-queue.js';

describe('Event Queue', () => {
  beforeEach(() => {
    clearEventQueue();
  });

  afterEach(() => {
    clearEventQueue();
  });

  describe('loadEventQueue', () => {
    it('should return empty queue initially', () => {
      const queue = loadEventQueue();
      expect(queue.events).toEqual([]);
    });
  });

  describe('saveEventQueue', () => {
    it('should persist queue data', () => {
      saveEventQueue({
        events: [],
        lastSyncAt: '2024-01-01T00:00:00Z',
      });

      const loaded = loadEventQueue();
      expect(loaded.lastSyncAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('enqueueEvent', () => {
    it('should add event to queue', () => {
      const event = enqueueEvent('agent', {
        projectId: 'test-project',
        sessionId: 'test-session',
        type: 'session_start',
        timestamp: new Date().toISOString(),
      });

      expect(event.id).toBeDefined();
      expect(event.type).toBe('agent');
      expect(event.retryCount).toBe(0);
    });

    it('should generate unique IDs', () => {
      const event1 = enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });
      const event2 = enqueueEvent('agent', { projectId: 'p2', sessionId: 's2', type: 'test', timestamp: new Date().toISOString() });

      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('getPendingEvents', () => {
    it('should return all events', () => {
      enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });
      enqueueEvent('cron', { projectId: 'p2', jobName: 'job1', type: 'start', timestamp: new Date().toISOString() });

      const all = getPendingEvents();
      expect(all).toHaveLength(2);
    });

    it('should filter by type', () => {
      enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });
      enqueueEvent('cron', { projectId: 'p2', jobName: 'job1', type: 'start', timestamp: new Date().toISOString() });

      const agentEvents = getPendingEvents('agent');
      expect(agentEvents).toHaveLength(1);
      expect(agentEvents[0].type).toBe('agent');
    });
  });

  describe('dequeueEvent', () => {
    it('should remove event from queue', () => {
      const event = enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });

      const removed = dequeueEvent(event.id);
      expect(removed).toBe(true);

      const remaining = getPendingEvents();
      expect(remaining).toHaveLength(0);
    });

    it('should return false for non-existent event', () => {
      const removed = dequeueEvent('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('dequeueEvents', () => {
    it('should remove multiple events', () => {
      const e1 = enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });
      const e2 = enqueueEvent('agent', { projectId: 'p2', sessionId: 's2', type: 'test', timestamp: new Date().toISOString() });
      enqueueEvent('agent', { projectId: 'p3', sessionId: 's3', type: 'test', timestamp: new Date().toISOString() });

      const removed = dequeueEvents([e1.id, e2.id]);
      expect(removed).toBe(2);

      const remaining = getPendingEvents();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', () => {
      const event = enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });
      expect(event.retryCount).toBe(0);

      incrementRetryCount(event.id);

      const updated = getPendingEvents()[0];
      expect(updated.retryCount).toBe(1);
    });
  });

  describe('getQueueStats', () => {
    it('should return correct statistics', () => {
      enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });
      enqueueEvent('agent', { projectId: 'p2', sessionId: 's2', type: 'test', timestamp: new Date().toISOString() });
      enqueueEvent('cron', { projectId: 'p3', jobName: 'job1', type: 'start', timestamp: new Date().toISOString() });

      const stats = getQueueStats();
      expect(stats.total).toBe(3);
      expect(stats.byType.agent).toBe(2);
      expect(stats.byType.cron).toBe(1);
    });
  });

  describe('clearEventQueue', () => {
    it('should clear all events', () => {
      enqueueEvent('agent', { projectId: 'p1', sessionId: 's1', type: 'test', timestamp: new Date().toISOString() });
      enqueueEvent('cron', { projectId: 'p2', jobName: 'job1', type: 'start', timestamp: new Date().toISOString() });

      clearEventQueue();

      const remaining = getPendingEvents();
      expect(remaining).toHaveLength(0);
    });
  });
});
