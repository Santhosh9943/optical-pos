// e2e/global-setup.ts
// Playwright globalSetup: pins the E2E bypass organization to a deterministic subscription plan.
//
// Why: the `x-e2e-bypass-auth` session resolves to DEFAULT_ORG_ID (src/lib/auth-utils.ts). Plan-gated
// screens (e.g. /admin/lab-orders behind the `workshop_lab_kanban` PlanUpgradeGate) otherwise render
// whatever plan that org happens to have in the shared DB, which makes the suite non-deterministic.

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';
import { PRICING_PLANS } from '../src/lib/plans';
import { canAccessFeature, type FeatureKey } from '../src/lib/feature-gate';

config({ path: '.env.local' });
config();

/** Mirrors DEFAULT_ORG_ID in src/lib/auth-utils.ts (not imported: that module pulls in next/headers). */
export const E2E_DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

/** Feature the E2E suites require the bypass org to have unlocked. */
const REQUIRED_FEATURE: FeatureKey = 'workshop_lab_kanban';

/**
 * Consumable fixture stock: POS checkout specs (pos-checkout, digital-engagement, ...) each sell one
 * unit of these seeded SKUs, so repeated runs drain them and checkout then (correctly) fails with
 * insufficient stock. Restored to the src/db/seed.ts level before every run; never lowered.
 */
const CONSUMABLE_FIXTURE_STOCK: ReadonlyArray<{ sku: string; minStock: number }> = [
  { sku: 'FRM-RB-2140-BLK', minStock: 12 },
];

/** TTL used by getCurrentPlanAction() in src/actions/plan-actions.ts. */
const PLAN_CACHE_TTL_SECONDS = 600;

/** Shape cached by getCurrentPlanAction() under `optix:{orgId}:plan:current`. */
interface CachedPlanStatus {
  planId: string;
  planName: string;
  subscriptionStatus: string;
  hasCompletedOnboarding: boolean;
}

/**
 * @description Returns the cheapest plan (PRICING_PLANS is ordered low -> high) that unlocks `feature`.
 * @param feature Feature key from src/lib/feature-gate.ts.
 * @returns The matching pricing plan.
 */
function lowestPlanUnlocking(feature: FeatureKey): (typeof PRICING_PLANS)[number] {
  const plan = PRICING_PLANS.find((p) => canAccessFeature(p.id, feature));
  if (!plan) throw new Error(`[e2e global-setup] No pricing plan unlocks feature "${feature}"`);
  return plan;
}

/**
 * @description Strips surrounding quotes/whitespace the same way src/lib/cache.ts does.
 * @param raw Raw env value.
 * @returns Sanitised value or empty string.
 */
function cleanEnv(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * @description Writes the fresh plan status through to every shared Redis tier the dev server reads.
 * The key is overwritten rather than deleted: HybridCacheManager.get() falls back to the dev server's
 * in-process LRU on a Redis miss, so a delete would let a stale in-memory 'starter' entry resurface.
 * @param value Fresh plan status to cache.
 * @returns Resolves once all configured tiers have been written.
 */
async function writeThroughPlanCache(value: CachedPlanStatus): Promise<void> {
  const cacheKey = `optix:${E2E_DEFAULT_ORG_ID}:plan:current`; // buildCacheKey({ orgId, namespace: 'plan', key: 'current' })
  let wroteSharedTier = false;

  const localRedisUrl = cleanEnv(process.env.LOCAL_REDIS_URL || process.env.REDIS_URL);
  if (localRedisUrl) {
    const client = new IORedis(localRedisUrl, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 1500 });
    try {
      await client.connect();
      await client.set(cacheKey, JSON.stringify(value), 'EX', PLAN_CACHE_TTL_SECONDS);
      wroteSharedTier = true;
    } catch (err) {
      console.warn('[e2e global-setup] Local Redis write skipped:', err instanceof Error ? err.message : err);
    } finally {
      client.disconnect();
    }
  }

  let upstashUrl = cleanEnv(process.env.UPSTASH_REDIS_REST_URL);
  const upstashToken = cleanEnv(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (upstashUrl && upstashToken) {
    if (!/^https?:\/\//.test(upstashUrl)) upstashUrl = `https://${upstashUrl}`;
    await new UpstashRedis({ url: upstashUrl, token: upstashToken }).set(cacheKey, value, {
      ex: PLAN_CACHE_TTL_SECONDS,
    });
    wroteSharedTier = true;
  }

  if (!wroteSharedTier) {
    console.warn(
      '[e2e global-setup] No shared Redis configured: an already-running dev server may keep serving a ' +
        `stale plan from its in-memory cache for up to ${PLAN_CACHE_TTL_SECONDS}s. Restart it or use ` +
        'Settings > "Clear All Caches" if plan-gated tests fail.'
    );
  }
}

/**
 * @description Playwright globalSetup entry point. Sets DEFAULT_ORG_ID's plan to the lowest tier that
 * unlocks the Workshop Lab Kanban, marks onboarding complete, refreshes the plan cache so the
 * running dev server sees it, and tops up consumable checkout fixture stock.
 * @returns Resolves when the fixture is in place.
 */
export default async function globalSetup(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('[e2e global-setup] DATABASE_URL is not set');

  const plan = lowestPlanUnlocking(REQUIRED_FEATURE);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const { rows } = await pool.query<{
      plan_id: string;
      subscription_status: string;
      has_completed_onboarding: boolean;
    }>(
      // has_completed_onboarding = true: the dashboard layout opens the full-screen
      // SubscriberOnboardingModal for paid plans that have not finished onboarding, which would
      // intercept clicks in every dashboard spec.
      `UPDATE organizations
          SET plan_id = $1, has_completed_onboarding = true, updated_at = now()
        WHERE id = $2
    RETURNING plan_id, subscription_status, has_completed_onboarding`,
      [plan.id, E2E_DEFAULT_ORG_ID]
    );
    if (rows.length === 0) {
      throw new Error(`[e2e global-setup] Organization ${E2E_DEFAULT_ORG_ID} not found; seed the database first.`);
    }

    await writeThroughPlanCache({
      planId: rows[0].plan_id,
      planName: plan.name,
      subscriptionStatus: rows[0].subscription_status || 'active',
      hasCompletedOnboarding: Boolean(rows[0].has_completed_onboarding),
    });

    for (const { sku, minStock } of CONSUMABLE_FIXTURE_STOCK) {
      await pool.query(
        `UPDATE inventory_items
            SET stock_quantity = GREATEST(stock_quantity, $1)
          WHERE sku = $2 AND organization_id = $3`,
        [minStock, sku, E2E_DEFAULT_ORG_ID]
      );
    }
  } finally {
    await pool.end();
  }
}
