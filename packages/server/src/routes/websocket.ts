/**
 * WebSocket routes for real-time updates
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { subscribe, unsubscribe, Channels, type PubSubEvent, type EventHandler } from '../lib/pubsub.js';
import { store } from '../lib/store.js';

/** WebSocket message types */
interface WSMessage {
  type: string;
  payload?: unknown;
}

interface SubscribePayload {
  channel: 'project' | 'agent' | 'agents' | 'runtimes' | 'crons' | 'alerts';
  id?: string;
}

interface AuthPayload {
  token: string;
}

/** Active WebSocket connections with their subscriptions */
const connections = new Map<WebSocket, {
  userId?: string;
  subscriptions: Map<string, EventHandler>;
}>();

/** Authenticate a WebSocket connection */
function authenticateWS(token: string): string | null {
  // Extract token from Bearer format if present
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  // Look up user by token
  const apiToken = store.getApiTokenByValue(cleanToken);
  if (apiToken) {
    return apiToken.userId;
  }

  return null;
}

/** Send a message to a WebSocket client */
function sendMessage(ws: WebSocket, type: string, payload?: unknown): void {
  if (ws.readyState === 1) { // OPEN
    ws.send(JSON.stringify({ type, payload }));
  }
}

/** Handle incoming WebSocket messages */
function handleMessage(
  ws: WebSocket,
  message: WSMessage,
  connState: { userId?: string; subscriptions: Map<string, EventHandler> }
): void {
  switch (message.type) {
    case 'auth': {
      const { token } = message.payload as AuthPayload;
      const userId = authenticateWS(token);

      if (userId) {
        connState.userId = userId;
        sendMessage(ws, 'auth:success', { userId });
      } else {
        sendMessage(ws, 'auth:error', { message: 'Invalid token' });
      }
      break;
    }

    case 'subscribe': {
      if (!connState.userId) {
        sendMessage(ws, 'error', { message: 'Not authenticated' });
        return;
      }

      const { channel, id } = message.payload as SubscribePayload;
      let channelName: string;

      switch (channel) {
        case 'project':
          if (!id) {
            sendMessage(ws, 'error', { message: 'Project ID required' });
            return;
          }
          // Verify user has access to project
          const project = store.getProject(id);
          if (!project || (project.ownerId !== connState.userId && !project.memberIds.includes(connState.userId))) {
            sendMessage(ws, 'error', { message: 'Access denied' });
            return;
          }
          channelName = Channels.PROJECT(id);
          break;
        case 'agent':
          if (!id) {
            sendMessage(ws, 'error', { message: 'Agent ID required' });
            return;
          }
          channelName = Channels.AGENT(id);
          break;
        case 'agents':
          channelName = Channels.AGENT_EVENTS;
          break;
        case 'runtimes':
          channelName = Channels.RUNTIME_EVENTS;
          break;
        case 'crons':
          channelName = Channels.CRON_EVENTS;
          break;
        case 'alerts':
          channelName = Channels.ALERT_EVENTS;
          break;
        default:
          sendMessage(ws, 'error', { message: 'Invalid channel' });
          return;
      }

      // Create handler for this subscription
      const handler: EventHandler = (event: PubSubEvent) => {
        sendMessage(ws, 'event', event);
      };

      // Subscribe to channel
      subscribe(channelName, handler).then(() => {
        connState.subscriptions.set(channelName, handler);
        sendMessage(ws, 'subscribed', { channel: channelName });
      }).catch((err) => {
        console.error('Subscribe error:', err);
        sendMessage(ws, 'error', { message: 'Failed to subscribe' });
      });
      break;
    }

    case 'unsubscribe': {
      const { channel, id } = message.payload as SubscribePayload;
      let channelName: string;

      switch (channel) {
        case 'project':
          channelName = id ? Channels.PROJECT(id) : '';
          break;
        case 'agent':
          channelName = id ? Channels.AGENT(id) : '';
          break;
        case 'agents':
          channelName = Channels.AGENT_EVENTS;
          break;
        case 'runtimes':
          channelName = Channels.RUNTIME_EVENTS;
          break;
        case 'crons':
          channelName = Channels.CRON_EVENTS;
          break;
        case 'alerts':
          channelName = Channels.ALERT_EVENTS;
          break;
        default:
          return;
      }

      const handler = connState.subscriptions.get(channelName);
      if (handler) {
        unsubscribe(channelName, handler).then(() => {
          connState.subscriptions.delete(channelName);
          sendMessage(ws, 'unsubscribed', { channel: channelName });
        });
      }
      break;
    }

    case 'ping':
      sendMessage(ws, 'pong');
      break;

    default:
      sendMessage(ws, 'error', { message: 'Unknown message type' });
  }
}

/** Clean up connection subscriptions */
async function cleanupConnection(ws: WebSocket): Promise<void> {
  const connState = connections.get(ws);
  if (!connState) return;

  // Unsubscribe from all channels
  const unsubPromises: Promise<void>[] = [];
  for (const [channel, handler] of connState.subscriptions) {
    unsubPromises.push(unsubscribe(channel, handler));
  }
  await Promise.all(unsubPromises);

  connections.delete(ws);
}

export async function websocketRoutes(fastify: FastifyInstance): Promise<void> {
  /** WebSocket endpoint for real-time updates */
  fastify.get('/ws', { websocket: true }, (socket: WebSocket, _req: FastifyRequest) => {
    // Initialize connection state
    const connState = {
      userId: undefined as string | undefined,
      subscriptions: new Map<string, EventHandler>(),
    };
    connections.set(socket, connState);

    // Send welcome message
    sendMessage(socket, 'connected', { message: 'WebSocket connected' });

    // Handle incoming messages
    socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        handleMessage(socket, message, connState);
      } catch (err) {
        sendMessage(socket, 'error', { message: 'Invalid JSON' });
      }
    });

    // Handle close
    socket.on('close', () => {
      cleanupConnection(socket);
    });

    // Handle errors
    socket.on('error', (err: Error) => {
      console.error('WebSocket error:', err);
      cleanupConnection(socket);
    });
  });
}
