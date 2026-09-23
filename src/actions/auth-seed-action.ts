'use server';

import { auth } from '@/lib/auth';
import { db } from '@/db';
import { user as userTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Ensures the default platform Super Admin account exists in the database.
 * Default credentials:
 * - Email: admin@optixos.com
 * - Password: AdminPass123!
 */
export async function ensureDefaultSuperAdminAction(): Promise<{ success: boolean; message?: string }> {
  try {
    const primaryAdmin = 'admin@optixos.com';
    const legacyAdmin = 'admin@optix.com';

    const [existingPrimary] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, primaryAdmin))
      .limit(1);

    if (!existingPrimary) {
      await auth.api.signUpEmail({
        body: {
          name: 'Super Administrator',
          email: primaryAdmin,
          password: 'AdminPass123!',
        },
      });
    }

    const [existingLegacy] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, legacyAdmin))
      .limit(1);

    if (!existingLegacy) {
      try {
        await auth.api.signUpEmail({
          body: {
            name: 'Optix Admin',
            email: legacyAdmin,
            password: 'AdminPass123!',
          },
        });
      } catch {
        // Ignore if concurrent creation
      }
    }

    return { success: true, message: 'Super Admin credentials confirmed.' };
  } catch (err: unknown) {
    console.warn('[ensureDefaultSuperAdminAction] Note:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Could not ensure admin',
    };
  }
}
