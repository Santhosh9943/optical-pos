/**
 * OptixOS Universal Multi-Tier Caching Engine
 * 
 * Hierarchy:
 * 1. Local Redis (TCP socket via ioredis) - Ultra-fast, zero-network-hop local development & bare-metal/Docker deployments.
 * 2. Cloud Upstash Redis (HTTP REST via @upstash/redis) - Resilient serverless & edge fallback.
 * 3. In-Memory LRU Cache (In-process Map with TTL) - Guaranteed zero-crash fallback when no Redis instance is reachable.
 * 4. Ground Truth: Neon PostgreSQL Database queries via automatic Cache-Aside pattern (withCache wrapper).
 */

import IORedis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

export type CacheProviderType = 'local-redis' | 'upstash' | 'memory';

export interface CacheOptions {
  key: string;
  orgId?: string;
  namespace?: string;
  ttl?: number; // In seconds, default: 300 (5 minutes)
  skipCache?: boolean;
}

export interface InvalidationTarget {
  orgId?: string;
  namespace?: string;
  key?: string;
  pattern?: string;
}

// ============================================================================
// 1. IN-MEMORY LRU CACHE PROVIDER (Zero external dependencies fallback)
// ============================================================================

interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null;
  lastAccessed: number;
}

class MemoryLRUProvider {
  private cache = new Map<string, MemoryCacheEntry>();
  private readonly maxEntries = 2000;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (entry.expiresAt && entry.expiresAt <= now) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccessed = now;
    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest accessed or expired item
      const now = Date.now();
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [k, v] of this.cache.entries()) {
        if (v.expiresAt && v.expiresAt <= now) {
          oldestKey = k;
          break;
        }
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    this.cache.set(key, {
      value: serialized,
      expiresAt,
      lastAccessed: Date.now(),
    });
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      for (const k of key) this.cache.delete(k);
    } else {
      this.cache.delete(key);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    // Convert wildcard pattern like 'optix:org-123:inventory:*' to RegExp
    const regex = new RegExp('^' + pattern.replace(/[*]/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async flushDb(): Promise<void> {
    this.cache.clear();
  }
}

// ============================================================================
// 2. LOCAL REDIS (TCP SOCKET via ioredis)
// ============================================================================

class LocalRedisProvider {
  private client: IORedis | null = null;
  private isConnected = false;
  private connectionFailed = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.LOCAL_REDIS_URL || process.env.REDIS_URL;
    if (!url) return;

    try {
      this.client = new IORedis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        commandTimeout: 2000,
        enableOfflineQueue: false,
        retryStrategy: () => null, // Do not endlessly hang on connection failure
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.connectionFailed = false;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.connectionFailed = true;
        // Suppress unhandled noisy logs in dev/test when local redis isn't booted
        if (process.env.NODE_ENV !== 'production') {
          // Debug level only
        } else {
          console.warn('[Cache:LocalRedis] Connection warning:', err.message);
        }
      });
    } catch (e) {
      this.connectionFailed = true;
      this.client = null;
    }
  }

  private async ensureConnection(): Promise<boolean> {
    if (!this.client || this.connectionFailed) return false;
    if (this.isConnected) return true;

    try {
      await this.client.connect();
      this.isConnected = true;
      return true;
    } catch {
      this.connectionFailed = true;
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const ready = await this.ensureConnection();
    if (!ready || !this.client) return null;

    try {
      const data = await this.client.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch (error) {
      console.warn(`[Cache:LocalRedis] get error for key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const ready = await this.ensureConnection();
    if (!ready || !this.client) return;

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.warn(`[Cache:LocalRedis] set error for key "${key}":`, error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    const ready = await this.ensureConnection();
    if (!ready || !this.client) return;

    try {
      if (Array.isArray(key)) {
        if (key.length > 0) await this.client.del(...key);
      } else {
        await this.client.del(key);
      }
    } catch (error) {
      console.warn('[Cache:LocalRedis] del error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    const ready = await this.ensureConnection();
    if (!ready || !this.client) return;

    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      console.warn(`[Cache:LocalRedis] delPattern error for pattern "${pattern}":`, error);
    }
  }

  async flushDb(): Promise<void> {
    const ready = await this.ensureConnection();
    if (!ready || !this.client) return;
    try {
      await this.client.flushdb();
    } catch (error) {
      console.warn('[Cache:LocalRedis] flushDb error:', error);
    }
  }

  isConfigured(): boolean {
    return this.client !== null && !this.connectionFailed;
  }
}

// ============================================================================
// 3. UPSTASH REDIS PROVIDER (HTTP REST via @upstash/redis)
// ============================================================================

class UpstashRedisProvider {
  private client: UpstashRedis | null = null;

  constructor() {
    try {
      const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
      const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!rawUrl || !rawToken) return;

      let url = rawUrl.trim().replace(/^["']|["']$/g, '').trim();
      const token = rawToken.trim().replace(/^["']|["']$/g, '').trim();

      if (!url || !token) return;
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = `https://${url}`;
      }

      this.client = new UpstashRedis({ url, token });
    } catch (error) {
      console.warn('[Cache:Upstash] Failed to initialize client:', error);
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const data = await this.client.get<T>(key);
      return data ?? null;
    } catch (error) {
      console.warn(`[Cache:Upstash] get error for key "${key}":`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, value, { ex: ttlSeconds });
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.warn(`[Cache:Upstash] set error for key "${key}":`, error);
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.client) return;
    try {
      if (Array.isArray(key)) {
        if (key.length > 0) await this.client.del(...key);
      } else {
        await this.client.del(key);
      }
    } catch (error) {
      console.warn('[Cache:Upstash] del error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.warn(`[Cache:Upstash] delPattern error for "${pattern}":`, error);
    }
  }

  async flushDb(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.flushdb();
    } catch (error) {
      console.warn('[Cache:Upstash] flushDb error:', error);
    }
  }

  getClient(): UpstashRedis | null {
    return this.client;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }
}

// ============================================================================
// 4. HYBRID CACHE MANAGER (Priority: Local Redis -> Upstash -> Memory LRU)
// ============================================================================

class HybridCacheManager {
  private localRedis: LocalRedisProvider;
  private upstash: UpstashRedisProvider;
  private memory: MemoryLRUProvider;

  constructor() {
    this.localRedis = new LocalRedisProvider();
    this.upstash = new UpstashRedisProvider();
    this.memory = new MemoryLRUProvider();
  }

  /**
   * Determine the active primary cache provider
   */
  getActiveProvider(): CacheProviderType {
    if (this.localRedis.isConfigured()) return 'local-redis';
    if (this.upstash.isConfigured()) return 'upstash';
    return 'memory';
  }

  /**
   * Read item from cache with cascading fallback
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. Try Local Redis if configured
    if (this.localRedis.isConfigured()) {
      const localData = await this.localRedis.get<T>(key);
      if (localData !== null) return localData;
    }

    // 2. Try Upstash Redis if configured
    if (this.upstash.isConfigured()) {
      const upstashData = await this.upstash.get<T>(key);
      if (upstashData !== null) return upstashData;
    }

    // 3. Fallback to In-Memory LRU Cache
    return await this.memory.get<T>(key);
  }

  /**
   * Store item in cache across active providers
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    // Populate In-Memory cache for lightning-fast subsequent hits in the same process
    await this.memory.set(key, value, ttlSeconds);

    // Populate Local Redis if available
    if (this.localRedis.isConfigured()) {
      await this.localRedis.set(key, value, ttlSeconds);
    }

    // Populate Upstash Redis if available
    if (this.upstash.isConfigured()) {
      await this.upstash.set(key, value, ttlSeconds);
    }
  }

  /**
   * Delete key(s) from all cache tiers
   */
  async del(key: string | string[]): Promise<void> {
    await Promise.allSettled([
      this.memory.del(key),
      this.localRedis.isConfigured() ? this.localRedis.del(key) : Promise.resolve(),
      this.upstash.isConfigured() ? this.upstash.del(key) : Promise.resolve(),
    ]);
  }

  /**
   * Delete keys matching a wildcard pattern across all cache tiers
   */
  async delPattern(pattern: string): Promise<void> {
    await Promise.allSettled([
      this.memory.delPattern(pattern),
      this.localRedis.isConfigured() ? this.localRedis.delPattern(pattern) : Promise.resolve(),
      this.upstash.isConfigured() ? this.upstash.delPattern(pattern) : Promise.resolve(),
    ]);
  }

  /**
   * Flush entire cache across all tiers
   */
  async flushDb(): Promise<void> {
    await Promise.allSettled([
      this.memory.flushDb(),
      this.localRedis.isConfigured() ? this.localRedis.flushDb() : Promise.resolve(),
      this.upstash.isConfigured() ? this.upstash.flushDb() : Promise.resolve(),
    ]);
  }

  /**
   * Expose the legacy Upstash Redis instance if available
   */
  getUpstashClient(): UpstashRedis | null {
    return this.upstash.getClient();
  }
}

// Global Singleton Instance
export const cacheManager = new HybridCacheManager();

// ============================================================================
// 5. AUTOMATED CACHE-ASIDE PATTERN WRAPPER (withCache)
// ============================================================================

/**
 * Resolves a canonical cache key formatted with multi-tenant and namespace safety:
 * Format: `optix:{orgId}:{namespace}:{key}`
 */
export function buildCacheKey(options: CacheOptions | string): string {
  if (typeof options === 'string') {
    return options;
  }

  const parts: string[] = ['optix'];
  if (options.orgId) parts.push(options.orgId);
  if (options.namespace) parts.push(options.namespace);
  parts.push(options.key);

  return parts.join(':');
}

/**
 * Universal automated Cache-Aside wrapper.
 * 
 * Execution Flow:
 * 1. Checks Cache Hierarchy (Local Redis -> Cloud Upstash -> Memory LRU).
 * 2. On Cache Hit: returns cached data immediately.
 * 3. On Cache Miss or Cache Error: executes primary database `fetcher()`.
 * 4. Asynchronously populates the cache with TTL.
 * 5. Returns database record with zero performance penalty.
 * 
 * @param optionsOrKey Cache options (key, orgId, namespace, ttl) or raw key string
 * @param fetcher Database query callback to execute on cache miss
 * @returns Cached or freshly fetched data
 */
export async function withCache<T>(
  optionsOrKey: CacheOptions | string,
  fetcher: () => Promise<T>
): Promise<T> {
  const options: CacheOptions =
    typeof optionsOrKey === 'string' ? { key: optionsOrKey } : optionsOrKey;

  // Direct bypass if requested
  if (options.skipCache) {
    return await fetcher();
  }

  const cacheKey = buildCacheKey(options);
  const ttl = options.ttl ?? 300; // 5 minutes default

  try {
    // 1. Check Cache Tier
    const cached = await cacheManager.get<T>(cacheKey);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
  } catch (err) {
    console.warn(`[withCache] Cache check failed for "${cacheKey}", querying DB:`, err);
  }

  // 2. Cache Miss: Execute primary database query
  const freshData = await fetcher();

  // 3. Populate Cache with TTL
  if (freshData !== undefined) {
    cacheManager.set(cacheKey, freshData, ttl).catch((err) => {
      console.warn(`[withCache] Failed to populate cache for "${cacheKey}":`, err);
    });
  }

  return freshData;
}

/**
 * Universal automated cache invalidation helper.
 * Supports deleting by explicit key, array of keys, or namespace/tenant pattern.
 * 
 * Examples:
 * - `invalidateCache({ orgId: 'org_123', namespace: 'inventory' })` -> deletes `optix:org_123:inventory:*`
 * - `invalidateCache('cache:patients:search:*')` -> pattern delete
 * - `invalidateCache(['key1', 'key2'])` -> multi-key delete
 * 
 * @param target Invalidation target specification
 */
export async function invalidateCache(
  target: InvalidationTarget | string | string[]
): Promise<void> {
  try {
    if (typeof target === 'string') {
      if (target.includes('*')) {
        await cacheManager.delPattern(target);
      } else {
        await cacheManager.del(target);
      }
      return;
    }

    if (Array.isArray(target)) {
      await cacheManager.del(target);
      return;
    }

    // Object target
    if (target.pattern) {
      await cacheManager.delPattern(target.pattern);
      return;
    }

    if (target.orgId && target.namespace) {
      if (target.key) {
        const fullKey = `optix:${target.orgId}:${target.namespace}:${target.key}`;
        await cacheManager.del(fullKey);
      } else {
        const pattern = `optix:${target.orgId}:${target.namespace}:*`;
        await cacheManager.delPattern(pattern);
      }
      return;
    }

    if (target.namespace) {
      const pattern = `optix:*:${target.namespace}:*`;
      await cacheManager.delPattern(pattern);
      return;
    }

    if (target.key) {
      await cacheManager.del(target.key);
    }
  } catch (error) {
    console.warn('[invalidateCache] Error during cache invalidation:', error);
  }
}

/**
 * Inspection utility to determine active caching environment
 */
export function getCacheProviderInfo(): {
  provider: CacheProviderType;
  isLocalConfigured: boolean;
  isUpstashConfigured: boolean;
} {
  return {
    provider: cacheManager.getActiveProvider(),
    isLocalConfigured: Boolean(process.env.LOCAL_REDIS_URL || process.env.REDIS_URL),
    isUpstashConfigured: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  };
}

/**
 * Direct low-level cache read helper.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  return await cacheManager.get<T>(key);
}

/**
 * Direct low-level cache write helper.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  await cacheManager.set(key, value, ttlSeconds);
}

/**
 * Direct low-level cache delete helper.
 */
export async function cacheDel(key: string | string[]): Promise<void> {
  await cacheManager.del(key);
}

/**
 * Direct low-level cache flush helper.
 */
export async function cacheFlush(): Promise<void> {
  await cacheManager.flushDb();
}

