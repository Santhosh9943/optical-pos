/**
 * OptixOS Redis & Caching Subsystem
 * 
 * Provides backward-compatible exports for existing codebase calls,
 * while transparently delegating to the Universal Multi-Tier Caching Engine (src/lib/cache.ts).
 */

import {
  cacheManager,
  withCache,
  invalidateCache,
  buildCacheKey,
  getCacheProviderInfo,
  type CacheOptions,
  type InvalidationTarget,
  type CacheProviderType,
} from './cache';
import type { Redis } from '@upstash/redis';

/**
 * Singleton Redis client instance (Upstash client if configured, for backward compatibility).
 */
export const redis: Redis | null = cacheManager.getUpstashClient();

/**
 * Check if Redis caching is configured and enabled in the current environment.
 */
export function isRedisConfigured(): boolean {
  const info = getCacheProviderInfo();
  return info.isLocalConfigured || info.isUpstashConfigured || true;
}

/**
 * Fetch a cached item by key across the multi-tier hierarchy.
 * Returns null on cache miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  return await cacheManager.get<T>(key);
}

/**
 * Store an item in cache with an optional TTL (in seconds).
 * Automatically propagates to active Local Redis, Upstash, and Memory LRU tiers.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  await cacheManager.set(key, value, ttlSeconds);
}

/**
 * Invalidate/delete one or more keys from the cache.
 */
export async function cacheDel(key: string | string[]): Promise<void> {
  await cacheManager.del(key);
}

/**
 * Flush all cached entries across all tiers.
 */
export async function cacheFlush(): Promise<void> {
  await cacheManager.flushDb();
}

// Re-export modern caching helpers and types
export {
  withCache,
  invalidateCache,
  buildCacheKey,
  getCacheProviderInfo,
  type CacheOptions,
  type InvalidationTarget,
  type CacheProviderType,
};
