import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Singleton Redis client instance.
 * Instantiated only when valid Upstash Redis credentials are provided.
 */
export const redis: Redis | null =
  url && token
    ? new Redis({
        url,
        token,
      })
    : null;

/**
 * Check if Redis caching is configured and enabled in the current environment.
 */
export function isRedisConfigured(): boolean {
  return redis !== null;
}

/**
 * Fetch a cached item by key.
 * Returns null on cache miss, or if Redis is not configured or fails.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<T>(key);
    return data ?? null;
  } catch (error) {
    console.warn(`[Redis] cacheGet error for key "${key}":`, error);
    return null;
  }
}

/**
 * Store an item in cache with an optional TTL (in seconds).
 * Gracefully ignores failures if Redis is not configured or unreachable.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  if (!redis) return;
  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    console.warn(`[Redis] cacheSet error for key "${key}":`, error);
  }
}

/**
 * Invalidate/delete one or more keys from the cache.
 */
export async function cacheDel(key: string | string[]): Promise<void> {
  if (!redis) return;
  try {
    if (Array.isArray(key)) {
      if (key.length > 0) {
        await redis.del(...key);
      }
    } else {
      await redis.del(key);
    }
  } catch (error) {
    console.warn(`[Redis] cacheDel error for key "${key}":`, error);
  }
}
