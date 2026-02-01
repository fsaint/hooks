/**
 * Redis client for caching and pub/sub
 */

import { Redis } from 'ioredis';
import type { ServerConfig } from './config.js';

/** Redis client type */
type RedisClient = Redis;

/** Redis client instance */
let client: RedisClient | null = null;

/** Subscriber instance (separate connection for pub/sub) */
let subscriber: RedisClient | null = null;

/** Publisher instance */
let publisher: RedisClient | null = null;

/** Key prefix for namespacing */
let keyPrefix = 'hooks:';

/** Initialize Redis connections */
export function initRedis(config: ServerConfig['redis']): void {
  keyPrefix = config.keyPrefix;

  // Main client for general operations
  client = new Redis(config.url, {
    keyPrefix,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  // Separate connections for pub/sub
  subscriber = new Redis(config.url, {
    keyPrefix,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  publisher = new Redis(config.url, {
    keyPrefix,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on('error', (err: Error) => {
    console.error('Redis client error:', err);
  });

  subscriber.on('error', (err: Error) => {
    console.error('Redis subscriber error:', err);
  });

  publisher.on('error', (err: Error) => {
    console.error('Redis publisher error:', err);
  });
}

/** Get the Redis client */
export function getRedisClient(): RedisClient {
  if (!client) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return client;
}

/** Get the Redis subscriber */
export function getRedisSubscriber(): RedisClient {
  if (!subscriber) {
    throw new Error('Redis subscriber not initialized. Call initRedis() first.');
  }
  return subscriber;
}

/** Get the Redis publisher */
export function getRedisPublisher(): RedisClient {
  if (!publisher) {
    throw new Error('Redis publisher not initialized. Call initRedis() first.');
  }
  return publisher;
}

/** Close all Redis connections */
export async function closeRedis(): Promise<void> {
  const promises: Promise<string>[] = [];

  if (client) {
    promises.push(client.quit());
    client = null;
  }

  if (subscriber) {
    promises.push(subscriber.quit());
    subscriber = null;
  }

  if (publisher) {
    promises.push(publisher.quit());
    publisher = null;
  }

  await Promise.all(promises);
}

/** Cache TTL values in seconds */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

/** Get a cached value */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  const value = await redis.get(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/** Set a cached value */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number = CacheTTL.MEDIUM
): Promise<void> {
  const redis = getRedisClient();
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

/** Delete a cached value */
export async function deleteCached(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}

/** Delete cached values by pattern */
export async function deleteCachedByPattern(pattern: string): Promise<number> {
  const redis = getRedisClient();
  const keys = await redis.keys(pattern);

  if (keys.length === 0) {
    return 0;
  }

  // Remove the key prefix since keys() returns prefixed keys
  const cleanKeys = keys.map((k: string) => k.replace(keyPrefix, ''));
  return redis.del(...cleanKeys);
}
