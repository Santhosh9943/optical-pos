import { db } from './index';
import { sql, eq, isNull, asc } from 'drizzle-orm';
import { organizations } from './schema';

async function migrateMultiTenantStaff() {
  console.log('[Migration] Starting multi-tenant staff & org code schema migration...');

  try {
    // 1. Add org_code and org_number to organizations table if they don't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'org_code'
        ) THEN
          ALTER TABLE organizations ADD COLUMN org_code VARCHAR(50) UNIQUE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'organizations' AND column_name = 'org_number'
        ) THEN
          ALTER TABLE organizations ADD COLUMN org_number INTEGER UNIQUE;
        END IF;
      END $$;
    `);
    console.log('[Migration] Checked / added org_code and org_number to organizations.');

    // 2. Add must_change_password to "user" table if it doesn't exist
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'user' AND column_name = 'must_change_password'
        ) THEN
          ALTER TABLE "user" ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);
    console.log('[Migration] Checked / added must_change_password to user table.');

    // 3. Create staff_store_assignments table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS staff_store_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'staff',
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS staff_store_assignments_org_idx ON staff_store_assignments(organization_id);
      CREATE INDEX IF NOT EXISTS staff_store_assignments_branch_idx ON staff_store_assignments(branch_id);
      CREATE INDEX IF NOT EXISTS staff_store_assignments_user_idx ON staff_store_assignments(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS staff_store_assignments_user_branch_uidx ON staff_store_assignments(user_id, branch_id);
    `);
    console.log('[Migration] Checked / created staff_store_assignments table and indexes.');

    // 4. Backfill default organization (00000000-0000-0000-0000-000000000001) with OPT-1 and 1
    const prefix = process.env.ORG_CODE_PREFIX || 'OPT';
    await db.execute(sql`
      UPDATE organizations
      SET org_number = 1, org_code = ${prefix + '-1'}
      WHERE id = '00000000-0000-0000-0000-000000000001' AND org_number IS NULL;
    `);

    // 5. Backfill any remaining organizations with sequential numbers using TypeScript Drizzle
    const orgsWithoutNumber = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(isNull(organizations.orgNumber))
      .orderBy(asc(organizations.createdAt));

    if (orgsWithoutNumber.length > 0) {
      const [maxRow] = await db
        .select({ maxNum: sql<number>`COALESCE(MAX(org_number), 0)` })
        .from(organizations);
      let currentNum = Number(maxRow?.maxNum || 0);

      for (const org of orgsWithoutNumber) {
        currentNum += 1;
        const code = `${prefix}-${currentNum}`;
        await db
          .update(organizations)
          .set({
            orgNumber: currentNum,
            orgCode: code,
          })
          .where(eq(organizations.id, org.id));
      }
    }
    console.log('[Migration] Backfilled org codes and numbers for all organizations.');

    // 6. Backfill existing members to staff_store_assignments for their org's main branch if not present
    await db.execute(sql`
      INSERT INTO staff_store_assignments (organization_id, branch_id, user_id, role, is_primary)
      SELECT 
        m.organization_id::uuid,
        b.id,
        m.user_id,
        m.role,
        true
      FROM member m
      JOIN branches b ON b.organization_id = m.organization_id::uuid
      WHERE NOT EXISTS (
        SELECT 1 FROM staff_store_assignments ssa
        WHERE ssa.user_id = m.user_id AND ssa.organization_id = m.organization_id::uuid
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log('[Migration] Backfilled initial staff store assignments.');

    console.log('[Migration] Multi-tenant staff schema migration completed successfully!');
  } catch (err) {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  }
}

migrateMultiTenantStaff().then(() => process.exit(0));
