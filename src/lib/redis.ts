import { Redis } from '@upstash/redis';

/**
 * Initializes the Upstash Redis client with resilient parameter sanitization
 * and zero-crash error handling.
 */
function initRedis(): Redis | null {
  try {
    const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
    const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!rawUrl || !rawToken) {
      return null;
    }

    // Strip surrounding quotes and whitespace if present (e.g. from .env files)
    let url = rawUrl.trim().replace(/^["']|["']$/g, '').trim();
    const token = rawToken.trim().replace(/^["']|["']$/g, '').trim();

    if (!url || !token) {
      return null;
    }

    // Normalize protocol to https:// if missing
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      url = `https://${url}`;
    }

    return new Redis({
      url,
      token,
    });
  } catch (error) {
    console.warn('[Redis] Failed to initialize Upstash Redis client. Bypassing Redis cache:', error);
    return null;
  }
}

/**
 * Singleton Redis client instance.
 * Instantiated only when valid Upstash Redis credentials are provided.
 */
export const redis: Redis | null = initRedis();

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
