/**
 * OptixOS Sliding-Window Rate Limiting Engine
 * 
 * Protects critical endpoints (auth, 2FA, OTP, checkout, search) against brute-force
 * and denial-of-service. Backed by Upstash Redis with automatic in-memory fallback.
 */

import { redis } from './redis';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // Unix timestamp in ms
}

// In-memory sliding window fallback store
const inMemoryStore = new Map<string, number[]>();

// Periodic cleanup of in-memory timestamps
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of inMemoryStore.entries()) {
      const valid = timestamps.filter((t) => t > now - 3600 * 1000);
      if (valid.length === 0) {
        inMemoryStore.delete(key);
      } else {
        inMemoryStore.set(key, valid);
      }
    }
  }, 60000);
}

/**
 * Checks a sliding-window rate limit for a given key.
 *
 * @param key Unique identifier (e.g. `ratelimit:auth:ip_or_email`)
 * @param limit Maximum allowed requests within the window
 * @param windowSeconds Duration of the rolling window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const resetAt = now + windowMs;

  // 1. Try Upstash Redis if configured
  if (redis) {
    try {
      const redisKey = `ratelimit:${key}`;
      const clearBefore = now - windowMs;

      // Pipeline: remove expired, add current, count elements in window, set TTL
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, clearBefore);
      pipeline.zadd(redisKey, { score: now, member: `${now}:${Math.random()}` });
      pipeline.zcard(redisKey);
      pipeline.expire(redisKey, windowSeconds * 2);

      const results = await pipeline.exec();
      const count = (results[2] as number) || 1;

      const remaining = Math.max(0, limit - count);
      return {
        success: count <= limit,
        limit,
        remaining,
        resetAt,
      };
    } catch (err) {
      console.warn('[RateLimit] Upstash Redis call failed, using in-memory fallback:', err);
    }
  }

  // 2. In-memory sliding window fallback
  const timestamps = inMemoryStore.get(key) || [];
  const validTimestamps = timestamps.filter((t) => t > now - windowMs);
  validTimestamps.push(now);
  inMemoryStore.set(key, validTimestamps);

  const count = validTimestamps.length;
  const remaining = Math.max(0, limit - count);

  return {
    success: count <= limit,
    limit,
    remaining,
    resetAt,
  };
}

/**
 * Standard pre-configured rate limiters for OptixOS.
 */
export const rateLimiters = {
  /** 5 attempts per 15 minutes for password/2FA login */
  auth: (identifier: string) => checkRateLimit(`auth:${identifier}`, 5, 900),

  /** 3 attempts per 5 minutes for OTP verification */
  otp: (identifier: string) => checkRateLimit(`otp:${identifier}`, 3, 300),

  /** 30 checkout transactions per minute per tenant */
  checkout: (orgId: string) => checkRateLimit(`checkout:${orgId}`, 30, 60),

  /** 60 search requests per minute per IP / session */
  search: (identifier: string) => checkRateLimit(`search:${identifier}`, 60, 60),

  /** 10 password reset requests per hour */
  passwordReset: (email: string) => checkRateLimit(`pwd_reset:${email}`, 10, 3600),
};
