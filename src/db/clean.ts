import { db } from '@/db';
import {
  payments,
  invoiceItems,
  invoices,
  opticalPrescriptions,
  inventoryItems,
  customers,
  branches,
  organizations,
  subscriptions,
  storeProfile,
  productTypes,
  staffStoreAssignments,
  notifications,
  notificationReads,
  notificationPreferences,
  approvalRequests,
  superAdminOtps,
  twoFactor,
  session,
  account,
  verification,
  invitation,
  member,
  organization,
  user,
} from '@/db/schema';
import { redis } from '@/lib/redis';

export async function cleanDatabase() {
  console.log('🧹 Purging all data from database to start clean slate (0 stores)…');

  // 1. Notifications & Alerts subsystem
  await db.delete(notificationReads);
  await db.delete(notificationPreferences);
  await db.delete(notifications);

  // 2. Transactional & Order tables
  await db.delete(payments);
  await db.delete(invoiceItems);
  await db.delete(invoices);
  await db.delete(opticalPrescriptions);
  await db.delete(inventoryItems);

  // 3. Customer relations & customers
  await db.update(customers).set({ primaryCustomerId: null });
  await db.delete(customers);

  // 4. Products & Dynamic Workflows
  await db.delete(productTypes);

  // 5. Staff assignments, store profiles & subscriptions
  await db.delete(staffStoreAssignments);
  await db.delete(storeProfile);
  await db.delete(subscriptions);

  // 6. Physical store branches & multi-tenant organizations
  await db.delete(branches);
  await db.delete(organizations);

  // 7. Super Admin governance & OTP records
  await db.delete(approvalRequests);
  await db.delete(superAdminOtps);

  // 8. Better-Auth identity tables
  await db.delete(twoFactor);
  await db.delete(session);
  await db.delete(account);
  await db.delete(verification);
  await db.delete(invitation);
  await db.delete(member);
  await db.delete(organization);
  await db.delete(user);

  // 9. Redis cache flush
  if (redis) {
    try {
      console.log('🧹 Flushing Redis search caches…');
      await redis.flushdb();
      console.log('  ✓ Redis cache cleared');
    } catch (e) {
      console.warn('Could not flush Redis:', e);
    }
  }

  console.log('✨ All sample and created data cleared! Currently ZERO stores & ZERO organizations.');
}

if (require.main === module) {
  cleanDatabase()
    .then(() => {
      // allow libuv event loop to drain naturally
      setTimeout(() => process.exit(0), 100);
    })
    .catch((err) => {
      console.error('Failed to clean database:', err);
      process.exit(1);
    });
}
