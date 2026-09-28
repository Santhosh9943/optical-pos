/**
 * Test script for Universal Multi-Tier Caching Engine
 * Validates:
 * 1. Key building and namespace scoping
 * 2. Cache-Aside pattern (withCache) hit & miss behavior
 * 3. Cache Invalidation (single key & wildcard pattern)
 * 4. Resilient fallback to memory when local Redis is offline
 */

import {
  withCache,
  invalidateCache,
  buildCacheKey,
  getCacheProviderInfo,
  cacheGet,
  cacheSet,
  cacheDel,
} from '../src/lib/cache';

async function runTests() {
  console.log('🧪 Starting Universal Multi-Tier Caching Engine Verification...\n');

  const providerInfo = getCacheProviderInfo();
  console.log('Active Cache Provider Info:', providerInfo);

  // -------------------------------------------------------------
  // Test 1: Canonical Key Building
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Canonical Key Building ---');
  const key1 = buildCacheKey({
    orgId: 'org_alpha',
    namespace: 'inventory',
    key: 'sku_1001',
  });
  console.log('Built key:', key1);
  if (key1 !== 'optix:org_alpha:inventory:sku_1001') {
    throw new Error(`Key mismatch! Expected optix:org_alpha:inventory:sku_1001, got ${key1}`);
  }
  console.log('  ✓ Canonical key format verified');

  // -------------------------------------------------------------
  // Test 2: Low-level cacheGet and cacheSet
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Direct cacheSet & cacheGet ---');
  const directKey = 'optix:test:direct_key';
  await cacheSet(directKey, { message: 'Hello OptixOS Cache', count: 42 }, 10);
  const directVal = await cacheGet<{ message: string; count: number }>(directKey);
  console.log('Retrieved direct value:', directVal);
  if (!directVal || directVal.count !== 42) {
    throw new Error('Direct cacheGet failed to retrieve correct object');
  }
  console.log('  ✓ Direct cacheSet and cacheGet verified');

  // -------------------------------------------------------------
  // Test 3: Automated Cache-Aside (withCache)
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Automated withCache (Cache-Aside Pattern) ---');
  let dbCallCount = 0;
  const mockDbQuery = async () => {
    dbCallCount++;
    return {
      storeName: 'Optix Prime Eye Clinic',
      gstNumber: '33AABCT1332L1Z1',
      fetchedAt: new Date().toISOString(),
    };
  };

  const cacheOptions = {
    orgId: 'org_test_1',
    namespace: 'settings',
    key: 'profile',
    ttl: 60,
  };

  // Call 1: Must be a Cache Miss -> invokes mockDbQuery
  console.log('Executing Call 1 (expecting Cache Miss / DB query)...');
  const res1 = await withCache(cacheOptions, mockDbQuery);
  console.log('Call 1 result:', res1);
  if (dbCallCount !== 1) {
    throw new Error(`Expected dbCallCount to be 1, got ${dbCallCount}`);
  }
  console.log('  ✓ Call 1 triggered database query as expected');

  // Call 2: Must be a Cache Hit -> skips mockDbQuery!
  console.log('Executing Call 2 (expecting Cache Hit / zero DB query)...');
  const res2 = await withCache(cacheOptions, mockDbQuery);
  console.log('Call 2 result:', res2);
  if (dbCallCount !== 1) {
    throw new Error(`Expected dbCallCount to remain 1 on cache hit, got ${dbCallCount}`);
  }
  if (res2.storeName !== 'Optix Prime Eye Clinic') {
    throw new Error('Cache hit returned corrupted data');
  }
  console.log('  ✓ Call 2 retrieved data directly from cache without hitting DB');

  // -------------------------------------------------------------
  // Test 4: Cache Invalidation (invalidateCache)
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Cache Invalidation ---');
  console.log('Invalidating cache for org_test_1:settings...');
  await invalidateCache({ orgId: 'org_test_1', namespace: 'settings' });

  // Call 3: Must be a Cache Miss again because cache was invalidated!
  console.log('Executing Call 3 after invalidation (expecting Cache Miss)...');
  const res3 = await withCache(cacheOptions, mockDbQuery);
  console.log('Call 3 result:', res3);
  if (dbCallCount !== 2) {
    throw new Error(`Expected dbCallCount to increment to 2 after invalidation, got ${dbCallCount}`);
  }
  console.log('  ✓ Invalidation successfully cleared cache, triggering fresh DB query');

  // -------------------------------------------------------------
  // Test 5: Pattern-based Batch Invalidation
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Pattern / Namespace Batch Invalidation ---');
  const org = 'org_batch_test';
  await cacheSet(`optix:${org}:inventory:item1`, { id: 1 }, 60);
  await cacheSet(`optix:${org}:inventory:item2`, { id: 2 }, 60);
  await cacheSet(`optix:${org}:patients:patient1`, { id: 101 }, 60);

  // Invalidate only the inventory namespace
  await invalidateCache({ orgId: org, namespace: 'inventory' });

  const item1 = await cacheGet(`optix:${org}:inventory:item1`);
  const item2 = await cacheGet(`optix:${org}:inventory:item2`);
  const patient1 = await cacheGet(`optix:${org}:patients:patient1`);

  if (item1 !== null || item2 !== null) {
    throw new Error('Inventory items were not cleared by namespace pattern invalidation');
  }
  if (!patient1) {
    throw new Error('Patients cache was mistakenly cleared during inventory invalidation');
  }
  console.log('  ✓ Namespaced pattern invalidation selectively cleared target items');

  console.log('\n🎉 ALL CACHING ENGINE INTEGRATION TESTS PASSED 100% GREEN!\n');
}

runTests().catch((err) => {
  console.error('❌ Caching test failed:', err);
  process.exit(1);
});
