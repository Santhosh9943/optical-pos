import { db } from '../src/db';
import {
  organizations,
  branches,
  member as memberTable,
  user as userTable,
  staffStoreAssignments,
} from '../src/db/schema';
import { eq } from 'drizzle-orm';
import {
  getSuperAdminSessionExpirySeconds,
  createSessionToken,
  verifySessionToken,
} from '../src/lib/super-admin-session';
import { setupPracticeOnboardingAction } from '../src/actions/tenant-actions';

async function runTests() {
  console.log('--- Testing Super Admin Session Expiration Config ---');
  const sessionExpiry = getSuperAdminSessionExpirySeconds();
  console.log('Active SUPER_ADMIN_SESSION_EXPIRY_SECONDS:', sessionExpiry);
  if (sessionExpiry !== 28800 && sessionExpiry !== Number(process.env.SUPER_ADMIN_SESSION_EXPIRY_SECONDS)) {
    throw new Error(`Unexpected session expiry: ${sessionExpiry}`);
  }

  const token = createSessionToken('msanthosh9943@gmail.com');
  const verified = verifySessionToken(token);
  if (!verified) {
    throw new Error('Failed to verify created session token');
  }
  const tokenDurationSec = Math.round((verified.exp - Date.now()) / 1000);
  console.log('Token calculated lifetime in seconds:', tokenDurationSec);
  if (tokenDurationSec < sessionExpiry - 10 || tokenDurationSec > sessionExpiry + 10) {
    throw new Error(`Token expiration mismatch: got ${tokenDurationSec}, expected ~${sessionExpiry}`);
  }
  console.log('✓ Super Admin session expiry token verified successfully!');

  console.log('\n--- Testing Organization Creation with Env Prefix, Branch Default & Owner Tagging ---');
  // Create a temporary test user
  const testUserId = `test-owner-user-${Date.now()}`;
  const testEmail = `testowner_${Date.now()}@example.com`;

  await db.insert(userTable).values({
    id: testUserId,
    name: 'Test Practice Owner',
    email: testEmail,
    emailVerified: true,
    role: 'user',
  });

  // Call setupPracticeOnboardingAction with optional branch omitted (should default to Main Branch)
  const result = await setupPracticeOnboardingAction({
    practiceName: 'Elite Vision Care',
    branchName: '', // empty to test default 'Main Branch'
    userEmail: testEmail,
  });

  console.log('setupPracticeOnboardingAction result:', result);

  if (!result.success || !result.organizationId || !result.branchId) {
    throw new Error(`Setup failed: ${result.error}`);
  }

  // 1. Verify prefix matches env (ORG_CODE_PREFIX)
  const prefix = (process.env.ORG_CODE_PREFIX || 'OPT').trim().toUpperCase();
  console.log('Expected Org Code prefix:', prefix);
  console.log('Generated Org Code:', result.orgCode);
  if (!result.orgCode?.startsWith(`${prefix}-`)) {
    throw new Error(`Expected orgCode to start with ${prefix}-, got ${result.orgCode}`);
  }

  // 2. Verify branch defaulted to "Main Branch"
  const [createdBranch] = await db
    .select()
    .from(branches)
    .where(eq(branches.id, result.branchId))
    .limit(1);

  console.log('Created branch name:', createdBranch?.name);
  if (createdBranch?.name !== 'Main Branch') {
    throw new Error(`Expected branch name to be 'Main Branch', got ${createdBranch?.name}`);
  }

  // 3. Verify memberTable role is 'owner'
  const [memberRecord] = await db
    .select()
    .from(memberTable)
    .where(eq(memberTable.userId, testUserId))
    .limit(1);

  console.log('memberTable role:', memberRecord?.role);
  if (memberRecord?.role !== 'owner') {
    throw new Error(`Expected memberTable role to be 'owner', got ${memberRecord?.role}`);
  }

  // 4. Verify staffStoreAssignments role is 'owner'
  const [assignment] = await db
    .select()
    .from(staffStoreAssignments)
    .where(eq(staffStoreAssignments.userId, testUserId))
    .limit(1);

  console.log('staffStoreAssignments role:', assignment?.role);
  if (assignment?.role !== 'owner') {
    throw new Error(`Expected staffStoreAssignments role to be 'owner', got ${assignment?.role}`);
  }

  // 5. Verify userTable role is updated to 'owner'
  const [updatedUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, testUserId))
    .limit(1);

  console.log('userTable role:', updatedUser?.role);
  if (updatedUser?.role !== 'owner') {
    throw new Error(`Expected userTable role to be 'owner', got ${updatedUser?.role}`);
  }

  console.log('✓ All 5 assertions passed cleanly!');

  // Cleanup test data
  console.log('\n--- Cleaning up test artifacts ---');
  await db.delete(staffStoreAssignments).where(eq(staffStoreAssignments.organizationId, result.organizationId));
  await db.delete(memberTable).where(eq(memberTable.organizationId, result.organizationId));
  await db.delete(branches).where(eq(branches.organizationId, result.organizationId));
  await db.delete(organizations).where(eq(organizations.id, result.organizationId));
  await db.delete(userTable).where(eq(userTable.id, testUserId));
  console.log('✓ Cleanup complete. Zero residual test data.');

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
