'use client';

/**
 * WebSocket hook for real-time updates
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

/** WebSocket connection states */
export type WSConnectionState = 'connecting' | 'connected' | 'authenticated' | 'disconnected' | 'error';

/** Channel types for subscriptions */
export type ChannelType = 'project' | 'agent' | 'agents' | 'runtimes' | 'crons' | 'alerts';

/** Event types from the server */
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

/** Real-time event structure */
export interface RealtimeEvent<T = unknown> {
  type: EventType;
  timestamp: string;
  projectId?: string;
  data: T;
}

/** WebSocket message from server */
interface WSMessage {
  type: string;
  payload?: unknown;
}

/** Event listener callback */
type EventListener<T = unknown> = (event: RealtimeEvent<T>) => void;

/** WebSocket connection state and controls */
interface UseWebSocketReturn {
  connectionState: WSConnectionState;
  subscribe: (channel: ChannelType, id?: string) => void;
  unsubscribe: (channel: ChannelType, id?: string) => void;
  addEventListener: <T = unknown>(eventType: EventType, listener: EventListener<T>) => () => void;
  isConnected: boolean;
}

export function useWebSocket(): UseWebSocketReturn {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<EventType, Set<EventListener>>>(new Map());
  const [connectionState, setConnectionState] = useState<WSConnectionState>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect when token is available
  useEffect(() => {
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnectionState('disconnected');
      return;
    }

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      setConnectionState('connecting');

      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;

        // Authenticate with token
        ws.send(JSON.stringify({
          type: 'auth',
          payload: { token },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          handleMessage(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        setConnectionState('disconnected');

        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        setConnectionState('error');
      };
    };

    const handleMessage = (message: WSMessage) => {
      switch (message.type) {
        case 'auth:success':
          setConnectionState('authenticated');
          break;

        case 'auth:error':
          setConnectionState('error');
          console.error('WebSocket auth error:', message.payload);
          break;

        case 'event': {
          const event = message.payload as RealtimeEvent;
          const listeners = listenersRef.current.get(event.type);
          if (listeners) {
            listeners.forEach((listener) => {
              try {
                listener(event);
              } catch (err) {
                console.error('Event listener error:', err);
              }
            });
          }
          break;
        }

        case 'pong':
          // Heartbeat response
          break;

        case 'error':
          console.error('WebSocket error:', message.payload);
          break;
      }
    };

    connect();

    // Setup heartbeat
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token]);

  const subscribe = useCallback((channel: ChannelType, id?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        payload: { channel, id },
      }));
    }
  }, []);

  const unsubscribe = useCallback((channel: ChannelType, id?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        payload: { channel, id },
      }));
    }
  }, []);

  const addEventListener = useCallback(<T = unknown>(
    eventType: EventType,
    listener: EventListener<T>
  ): (() => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(listener as EventListener);

    // Return cleanup function
    return () => {
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        listeners.delete(listener as EventListener);
      }
    };
  }, []);

  return {
    connectionState,
    subscribe,
    unsubscribe,
    addEventListener,
    isConnected: connectionState === 'authenticated',
  };
}
