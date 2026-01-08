import { Redis, type RedisOptions } from 'ioredis';

// =============================================================================
// Configuration
// =============================================================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Connection pool and retry configuration
 */
const baseOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) {
      console.error('[Redis] Max retries exceeded, giving up');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 3000);
    console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some(e => err.message.includes(e));
  },
  lazyConnect: true,
  enableReadyCheck: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  keepAlive: 30000,
  family: 4, // Force IPv4
};

// =============================================================================
// Redis Clients
// =============================================================================

/**
 * Main Redis client for general operations (caching, session storage, etc.)
 */
export const redis = new Redis(REDIS_URL, {
  ...baseOptions,
  connectionName: 'main',
  db: 0,
});

/**
 * Subscriber client for pub/sub (needs separate connection)
 * Note: Once a client enters subscriber mode, it cannot be used for other commands
 */
export const redisSub = new Redis(REDIS_URL, {
  ...baseOptions,
  connectionName: 'subscriber',
  db: 0,
});

/**
 * Publisher client for pub/sub
 */
export const redisPub = new Redis(REDIS_URL, {
  ...baseOptions,
  connectionName: 'publisher',
  db: 0,
});

// =============================================================================
// Connection Status Tracking
// =============================================================================

export interface RedisStatus {
  main: 'disconnected' | 'connecting' | 'connected' | 'ready' | 'error';
  subscriber: 'disconnected' | 'connecting' | 'connected' | 'ready' | 'error';
  publisher: 'disconnected' | 'connecting' | 'connected' | 'ready' | 'error';
  lastError: string | null;
  lastHealthCheck: string | null;
}

const status: RedisStatus = {
  main: 'disconnected',
  subscriber: 'disconnected',
  publisher: 'disconnected',
  lastError: null,
  lastHealthCheck: null,
};

/**
 * Get current Redis connection status
 */
export function getRedisStatus(): RedisStatus {
  return { ...status };
}

/**
 * Check if Redis is available and healthy
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const result = await redis.ping();
    status.lastHealthCheck = new Date().toISOString();
    return result === 'PONG';
  } catch {
    return false;
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

function setupEventHandlers(client: Redis, name: string, statusKey: keyof Pick<RedisStatus, 'main' | 'subscriber' | 'publisher'>) {
  client.on('error', (err) => {
    status[statusKey] = 'error';
    status.lastError = `[${name}] ${err.message}`;
    console.error(`[Redis ${name}] Connection error:`, err.message);
  });

  client.on('connect', () => {
    status[statusKey] = 'connected';
    console.log(`[Redis ${name}] Connected`);
  });

  client.on('ready', () => {
    status[statusKey] = 'ready';
    console.log(`[Redis ${name}] Ready`);
  });

  client.on('close', () => {
    status[statusKey] = 'disconnected';
    console.log(`[Redis ${name}] Connection closed`);
  });

  client.on('reconnecting', () => {
    status[statusKey] = 'connecting';
    console.log(`[Redis ${name}] Reconnecting...`);
  });
}

setupEventHandlers(redis, 'Main', 'main');
setupEventHandlers(redisSub, 'Sub', 'subscriber');
setupEventHandlers(redisPub, 'Pub', 'publisher');

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Connect all Redis clients
 */
export async function connectRedis(): Promise<void> {
  try {
    await Promise.all([
      redis.connect(),
      redisSub.connect(),
      redisPub.connect(),
    ]);
    console.log('[Redis] All clients connected');
  } catch (err) {
    const error = err as Error;
    status.lastError = error.message;
    console.error('[Redis] Failed to connect:', error.message);
    // Don't throw - allow app to run without Redis in dev
  }
}

/**
 * Graceful shutdown of all Redis connections
 */
export async function disconnectRedis(): Promise<void> {
  const timeout = 5000;

  try {
    await Promise.race([
      Promise.all([
        redis.quit(),
        redisSub.quit(),
        redisPub.quit(),
      ]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Disconnect timeout')), timeout)
      ),
    ]);
    console.log('[Redis] Disconnected gracefully');
  } catch (err) {
    console.warn('[Redis] Forceful disconnect:', (err as Error).message);
    // Force disconnect if graceful quit fails
    redis.disconnect();
    redisSub.disconnect();
    redisPub.disconnect();
  }
}

// =============================================================================
// Session Storage Service
// =============================================================================

const SESSION_PREFIX = 'session:';
const DEFAULT_SESSION_TTL = 86400; // 24 hours in seconds

export interface SessionData {
  userId: string;
  email?: string;
  name?: string;
  createdAt: string;
  lastAccessedAt: string;
  metadata?: Record<string, unknown>;
}

export const sessionStore = {
  /**
   * Create or update a session
   */
  async set(sessionId: string, data: SessionData, ttl: number = DEFAULT_SESSION_TTL): Promise<void> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const sessionData = {
      ...data,
      lastAccessedAt: new Date().toISOString(),
    };
    await redis.set(key, JSON.stringify(sessionData), 'EX', ttl);
  },

  /**
   * Get session data
   */
  async get(sessionId: string): Promise<SessionData | null> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as SessionData;
    } catch {
      console.error('[Redis Session] Failed to parse session data');
      return null;
    }
  },

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<boolean> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const result = await redis.del(key);
    return result > 0;
  },

  /**
   * Touch a session (update TTL without changing data)
   */
  async touch(sessionId: string, ttl: number = DEFAULT_SESSION_TTL): Promise<boolean> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const result = await redis.expire(key, ttl);
    return result === 1;
  },

  /**
   * Check if a session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Get all session IDs for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const pattern = `${SESSION_PREFIX}*`;
    const keys = await redis.keys(pattern);
    const sessions: string[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        try {
          const parsed = JSON.parse(data) as SessionData;
          if (parsed.userId === userId) {
            sessions.push(key.replace(SESSION_PREFIX, ''));
          }
        } catch {
          // Skip invalid session data
        }
      }
    }

    return sessions;
  },

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    const sessionIds = await this.getUserSessions(userId);
    if (sessionIds.length === 0) return 0;

    const keys = sessionIds.map(id => `${SESSION_PREFIX}${id}`);
    return await redis.del(...keys);
  },
};

// =============================================================================
// Caching Service
// =============================================================================

const CACHE_PREFIX = 'cache:';
const DEFAULT_CACHE_TTL = 3600; // 1 hour in seconds

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

export const cache = {
  /**
   * Set a cached value
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const ttl = options.ttl ?? DEFAULT_CACHE_TTL;
    const data = JSON.stringify({ value, tags: options.tags || [], cachedAt: Date.now() });

    await redis.set(cacheKey, data, 'EX', ttl);

    // Store tag associations for invalidation
    if (options.tags && options.tags.length > 0) {
      const multi = redis.multi();
      for (const tag of options.tags) {
        multi.sadd(`${CACHE_PREFIX}tag:${tag}`, cacheKey);
        multi.expire(`${CACHE_PREFIX}tag:${tag}`, ttl);
      }
      await multi.exec();
    }
  },

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const data = await redis.get(cacheKey);

    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return parsed.value as T;
    } catch {
      console.error('[Redis Cache] Failed to parse cached data');
      return null;
    }
  },

  /**
   * Get or set a cached value
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, options);
    return value;
  },

  /**
   * Delete a cached value
   */
  async delete(key: string): Promise<boolean> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const result = await redis.del(cacheKey);
    return result > 0;
  },

  /**
   * Delete all cached values with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = `${CACHE_PREFIX}tag:${tag}`;
    const keys = await redis.smembers(tagKey);

    if (keys.length === 0) return 0;

    const multi = redis.multi();
    for (const key of keys) {
      multi.del(key);
    }
    multi.del(tagKey);

    await multi.exec();
    return keys.length;
  },

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const result = await redis.exists(cacheKey);
    return result === 1;
  },

  /**
   * Get TTL for a cached key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    return await redis.ttl(cacheKey);
  },

  /**
   * Clear all cache entries (use with caution)
   */
  async clear(): Promise<number> {
    const pattern = `${CACHE_PREFIX}*`;
    const keys = await redis.keys(pattern);

    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  },
};

// =============================================================================
// Pub/Sub Service
// =============================================================================

type MessageHandler<T = unknown> = (channel: string, message: T) => void | Promise<void>;

const channelHandlers = new Map<string, Set<MessageHandler>>();

export const pubsub = {
  /**
   * Subscribe to a channel
   */
  async subscribe<T = unknown>(channel: string, handler: MessageHandler<T>): Promise<void> {
    if (!channelHandlers.has(channel)) {
      channelHandlers.set(channel, new Set());
      await redisSub.subscribe(channel);
    }

    channelHandlers.get(channel)!.add(handler as MessageHandler);
  },

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, handler?: MessageHandler): Promise<void> {
    const handlers = channelHandlers.get(channel);

    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
    }

    if (!handler || handlers.size === 0) {
      channelHandlers.delete(channel);
      await redisSub.unsubscribe(channel);
    }
  },

  /**
   * Publish a message to a channel
   */
  async publish<T>(channel: string, message: T): Promise<number> {
    const payload = JSON.stringify(message);
    return await redisPub.publish(channel, payload);
  },

  /**
   * Subscribe to a pattern of channels
   */
  async psubscribe<T = unknown>(pattern: string, handler: MessageHandler<T>): Promise<void> {
    if (!channelHandlers.has(pattern)) {
      channelHandlers.set(pattern, new Set());
      await redisSub.psubscribe(pattern);
    }

    channelHandlers.get(pattern)!.add(handler as MessageHandler);
  },

  /**
   * Unsubscribe from a pattern
   */
  async punsubscribe(pattern: string, handler?: MessageHandler): Promise<void> {
    const handlers = channelHandlers.get(pattern);

    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
    }

    if (!handler || handlers.size === 0) {
      channelHandlers.delete(pattern);
      await redisSub.punsubscribe(pattern);
    }
  },

  /**
   * Get the number of subscribers for a channel
   */
  async getSubscriberCount(channel: string): Promise<number> {
    const result = await redisPub.pubsub('NUMSUB', channel);
    return (result[1] as number) || 0;
  },
};

// Setup message handler for subscriptions
redisSub.on('message', (channel: string, message: string) => {
  const handlers = channelHandlers.get(channel);
  if (!handlers) return;

  let parsedMessage: unknown;
  try {
    parsedMessage = JSON.parse(message);
  } catch {
    parsedMessage = message;
  }

  for (const handler of handlers) {
    try {
      handler(channel, parsedMessage);
    } catch (err) {
      console.error(`[Redis PubSub] Handler error on channel ${channel}:`, err);
    }
  }
});

// Setup pattern message handler
redisSub.on('pmessage', (pattern: string, channel: string, message: string) => {
  const handlers = channelHandlers.get(pattern);
  if (!handlers) return;

  let parsedMessage: unknown;
  try {
    parsedMessage = JSON.parse(message);
  } catch {
    parsedMessage = message;
  }

  for (const handler of handlers) {
    try {
      handler(channel, parsedMessage);
    } catch (err) {
      console.error(`[Redis PubSub] Handler error on pattern ${pattern}:`, err);
    }
  }
});

// =============================================================================
// Rate Limiting
// =============================================================================

export const rateLimiter = {
  /**
   * Check if a rate limit is exceeded using sliding window algorithm
   */
  async isRateLimited(key: string, limit: number, windowSeconds: number): Promise<{
    limited: boolean;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const redisKey = `ratelimit:${key}`;

    // Remove old entries and add current request
    const multi = redis.multi();
    multi.zremrangebyscore(redisKey, 0, windowStart);
    multi.zadd(redisKey, now.toString(), `${now}:${Math.random()}`);
    multi.zcard(redisKey);
    multi.expire(redisKey, windowSeconds);

    const results = await multi.exec();
    const count = (results?.[2]?.[1] as number) || 0;

    return {
      limited: count > limit,
      remaining: Math.max(0, limit - count),
      resetAt: now + (windowSeconds * 1000),
    };
  },

  /**
   * Simple fixed window counter for rate limiting
   */
  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const redisKey = `ratelimit:counter:${key}`;

    const multi = redis.multi();
    multi.incr(redisKey);
    multi.ttl(redisKey);

    const results = await multi.exec();
    const count = (results?.[0]?.[1] as number) || 1;
    let ttl = (results?.[1]?.[1] as number) || -1;

    if (ttl === -1) {
      await redis.expire(redisKey, windowSeconds);
      ttl = windowSeconds;
    }

    return { count, ttl };
  },
};

// =============================================================================
// Distributed Locking
// =============================================================================

const LOCK_PREFIX = 'lock:';

export const lock = {
  /**
   * Acquire a distributed lock
   */
  async acquire(key: string, ttlMs: number = 10000): Promise<string | null> {
    const lockKey = `${LOCK_PREFIX}${key}`;
    const lockValue = `${Date.now()}:${Math.random().toString(36).slice(2)}`;

    const result = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX');

    return result === 'OK' ? lockValue : null;
  },

  /**
   * Release a distributed lock
   */
  async release(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `${LOCK_PREFIX}${key}`;

    // Use Lua script to ensure atomic check-and-delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, 1, lockKey, lockValue) as number;
    return result === 1;
  },

  /**
   * Extend a lock's TTL
   */
  async extend(key: string, lockValue: string, ttlMs: number): Promise<boolean> {
    const lockKey = `${LOCK_PREFIX}${key}`;

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, 1, lockKey, lockValue, ttlMs.toString()) as number;
    return result === 1;
  },

  /**
   * Execute a function with a distributed lock
   */
  async withLock<T>(key: string, fn: () => Promise<T>, options: { ttlMs?: number; retryMs?: number; maxRetries?: number } = {}): Promise<T> {
    const { ttlMs = 10000, retryMs = 100, maxRetries = 50 } = options;

    let lockValue: string | null = null;
    let attempts = 0;

    while (!lockValue && attempts < maxRetries) {
      lockValue = await this.acquire(key, ttlMs);
      if (!lockValue) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, retryMs));
      }
    }

    if (!lockValue) {
      throw new Error(`Failed to acquire lock for ${key} after ${maxRetries} attempts`);
    }

    try {
      return await fn();
    } finally {
      await this.release(key, lockValue);
    }
  },
};
