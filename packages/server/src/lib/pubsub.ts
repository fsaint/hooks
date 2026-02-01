/**
 * Pub/Sub system for real-time events
 */

import { getRedisPublisher, getRedisSubscriber } from './redis.js';

/** Event channel names */
export const Channels = {
  /** Agent events (sessions, heartbeats) */
  AGENT_EVENTS: 'events:agent',
  /** Runtime status updates */
  RUNTIME_EVENTS: 'events:runtime',
  /** Cron job events */
  CRON_EVENTS: 'events:cron',
  /** Alert notifications */
  ALERT_EVENTS: 'events:alert',
  /** Project-specific channel prefix */
  PROJECT: (projectId: string) => `project:${projectId}`,
  /** Agent-specific channel prefix */
  AGENT: (agentId: string) => `agent:${agentId}`,
} as const;

/** Event types */
export type EventType =
  | 'agent.session.started'
  | 'agent.session.ended'
  | 'agent.heartbeat'
  | 'agent.event'
  | 'runtime.status'
  | 'runtime.check'
  | 'cron.started'
  | 'cron.completed'
  | 'cron.failed'
  | 'cron.missed'
  | 'alert.triggered'
  | 'alert.acknowledged'
  | 'alert.resolved';

/** Published event structure */
export interface PubSubEvent<T = unknown> {
  type: EventType;
  timestamp: string;
  projectId?: string;
  data: T;
}

/** Event handler type */
export type EventHandler<T = unknown> = (event: PubSubEvent<T>) => void;

/** Active subscriptions */
const subscriptions = new Map<string, Set<EventHandler>>();

/** Publish an event to a channel */
export async function publish<T>(
  channel: string,
  event: PubSubEvent<T>
): Promise<void> {
  const publisher = getRedisPublisher();
  await publisher.publish(channel, JSON.stringify(event));
}

/** Publish an event to multiple channels */
export async function publishToMany<T>(
  channels: string[],
  event: PubSubEvent<T>
): Promise<void> {
  const publisher = getRedisPublisher();
  const message = JSON.stringify(event);
  await Promise.all(channels.map((ch) => publisher.publish(ch, message)));
}

/** Subscribe to a channel */
export async function subscribe(
  channel: string,
  handler: EventHandler
): Promise<void> {
  const subscriber = getRedisSubscriber();

  if (!subscriptions.has(channel)) {
    subscriptions.set(channel, new Set());
    await subscriber.subscribe(channel);
  }

  subscriptions.get(channel)!.add(handler);
}

/** Unsubscribe from a channel */
export async function unsubscribe(
  channel: string,
  handler?: EventHandler
): Promise<void> {
  const subscriber = getRedisSubscriber();
  const handlers = subscriptions.get(channel);

  if (!handlers) {
    return;
  }

  if (handler) {
    handlers.delete(handler);
    if (handlers.size === 0) {
      subscriptions.delete(channel);
      await subscriber.unsubscribe(channel);
    }
  } else {
    subscriptions.delete(channel);
    await subscriber.unsubscribe(channel);
  }
}

/** Initialize the pub/sub message handler */
export function initPubSub(): void {
  const subscriber = getRedisSubscriber();

  subscriber.on('message', (channel: string, message: string) => {
    const handlers = subscriptions.get(channel);
    if (!handlers || handlers.size === 0) {
      return;
    }

    try {
      const event = JSON.parse(message) as PubSubEvent;
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (err) {
          console.error('Pub/sub handler error:', err);
        }
      }
    } catch (err) {
      console.error('Failed to parse pub/sub message:', err);
    }
  });
}

/** Helper to create an event */
export function createEvent<T>(
  type: EventType,
  data: T,
  projectId?: string
): PubSubEvent<T> {
  return {
    type,
    timestamp: new Date().toISOString(),
    projectId,
    data,
  };
}

/** Publish an agent event */
export async function publishAgentEvent<T>(
  agentId: string,
  projectId: string,
  type: EventType,
  data: T
): Promise<void> {
  const event = createEvent(type, data, projectId);

  await publishToMany(
    [
      Channels.AGENT_EVENTS,
      Channels.PROJECT(projectId),
      Channels.AGENT(agentId),
    ],
    event
  );
}

/** Publish a runtime event */
export async function publishRuntimeEvent<T>(
  runtimeId: string,
  projectId: string,
  type: EventType,
  data: T
): Promise<void> {
  const event = createEvent(type, data, projectId);

  await publishToMany(
    [Channels.RUNTIME_EVENTS, Channels.PROJECT(projectId)],
    event
  );
}

/** Publish a cron event */
export async function publishCronEvent<T>(
  cronId: string,
  projectId: string,
  type: EventType,
  data: T
): Promise<void> {
  const event = createEvent(type, data, projectId);

  await publishToMany(
    [Channels.CRON_EVENTS, Channels.PROJECT(projectId)],
    event
  );
}

/** Publish an alert event */
export async function publishAlertEvent<T>(
  alertId: string,
  projectId: string,
  type: EventType,
  data: T
): Promise<void> {
  const event = createEvent(type, data, projectId);

  await publishToMany(
    [Channels.ALERT_EVENTS, Channels.PROJECT(projectId)],
    event
  );
}
