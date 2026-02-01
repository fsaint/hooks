'use client';

/**
 * WebSocket context for real-time updates
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useWebSocket, type WSConnectionState, type ChannelType, type EventType, type RealtimeEvent } from '@/hooks/use-websocket';

interface WebSocketContextValue {
  connectionState: WSConnectionState;
  subscribe: (channel: ChannelType, id?: string) => void;
  unsubscribe: (channel: ChannelType, id?: string) => void;
  addEventListener: <T = unknown>(eventType: EventType, listener: (event: RealtimeEvent<T>) => void) => () => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = useWebSocket();

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

/** Hook for subscribing to project events */
export function useProjectEvents(
  projectId: string | undefined,
  onEvent?: (event: RealtimeEvent) => void
) {
  const { subscribe, unsubscribe, addEventListener, isConnected } = useWebSocketContext();

  useEffect(() => {
    if (!projectId || !isConnected) return;

    // Subscribe to project channel
    subscribe('project', projectId);

    // Cleanup on unmount
    return () => {
      unsubscribe('project', projectId);
    };
  }, [projectId, isConnected, subscribe, unsubscribe]);

  useEffect(() => {
    if (!onEvent || !isConnected) return;

    // Listen for all event types
    const eventTypes: EventType[] = [
      'agent.session.started',
      'agent.session.ended',
      'agent.heartbeat',
      'agent.event',
      'runtime.status',
      'runtime.check',
      'cron.started',
      'cron.completed',
      'cron.failed',
      'cron.missed',
      'alert.triggered',
      'alert.acknowledged',
      'alert.resolved',
    ];

    const cleanups = eventTypes.map((type) =>
      addEventListener(type, (event) => {
        if (event.projectId === projectId) {
          onEvent(event);
        }
      })
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [projectId, onEvent, addEventListener, isConnected]);
}

/** Hook for subscribing to agent events */
export function useAgentEvents(
  agentId: string | undefined,
  onEvent?: (event: RealtimeEvent) => void
) {
  const { subscribe, unsubscribe, addEventListener, isConnected } = useWebSocketContext();

  useEffect(() => {
    if (!agentId || !isConnected) return;

    subscribe('agent', agentId);

    return () => {
      unsubscribe('agent', agentId);
    };
  }, [agentId, isConnected, subscribe, unsubscribe]);

  useEffect(() => {
    if (!onEvent || !isConnected) return;

    const eventTypes: EventType[] = [
      'agent.session.started',
      'agent.session.ended',
      'agent.heartbeat',
      'agent.event',
    ];

    const cleanups = eventTypes.map((type) =>
      addEventListener(type, onEvent)
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [onEvent, addEventListener, isConnected]);
}

/** Hook for subscribing to global events by category */
export function useGlobalEvents(
  category: 'agents' | 'runtimes' | 'crons' | 'alerts',
  onEvent?: (event: RealtimeEvent) => void
) {
  const { subscribe, unsubscribe, addEventListener, isConnected } = useWebSocketContext();

  useEffect(() => {
    if (!isConnected) return;

    subscribe(category);

    return () => {
      unsubscribe(category);
    };
  }, [category, isConnected, subscribe, unsubscribe]);

  useEffect(() => {
    if (!onEvent || !isConnected) return;

    const eventTypeMap: Record<string, EventType[]> = {
      agents: ['agent.session.started', 'agent.session.ended', 'agent.heartbeat', 'agent.event'],
      runtimes: ['runtime.status', 'runtime.check'],
      crons: ['cron.started', 'cron.completed', 'cron.failed', 'cron.missed'],
      alerts: ['alert.triggered', 'alert.acknowledged', 'alert.resolved'],
    };

    const eventTypes = eventTypeMap[category] || [];
    const cleanups = eventTypes.map((type) =>
      addEventListener(type, onEvent)
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [category, onEvent, addEventListener, isConnected]);
}
