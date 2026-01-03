import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Main Redis client for general operations
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

// Subscriber client for pub/sub (needs separate connection)
export const redisSub = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Publisher client for pub/sub
export const redisPub = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redisSub.on('error', (err) => {
  console.error('[Redis Sub] Connection error:', err.message);
});

redisPub.on('error', (err) => {
  console.error('[Redis Pub] Connection error:', err.message);
});

// Connect all clients
export async function connectRedis() {
  try {
    await Promise.all([
      redis.connect(),
      redisSub.connect(),
      redisPub.connect(),
    ]);
    console.log('[Redis] All clients connected');
  } catch (err) {
    console.error('[Redis] Failed to connect:', err);
    // Don't throw - allow app to run without Redis in dev
  }
}

// Graceful shutdown
export async function disconnectRedis() {
  await Promise.all([
    redis.quit(),
    redisSub.quit(),
    redisPub.quit(),
  ]);
  console.log('[Redis] Disconnected');
}
