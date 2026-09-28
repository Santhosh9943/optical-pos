import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function migrateApprovals() {
  console.log('🚀 Running approval_requests table migration on Neon Postgres…');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "approval_requests" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "type" varchar(50) NOT NULL,
      "target_id" text NOT NULL,
      "target_name" varchar(255) NOT NULL,
      "requester_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "requester_email" varchar(255) NOT NULL,
      "requester_name" varchar(255) NOT NULL,
      "reason" text NOT NULL,
      "status" varchar(30) DEFAULT 'pending' NOT NULL,
      "reviewed_by" text,
      "reviewed_at" timestamp with time zone,
      "organization_id" uuid,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "approval_status_idx" ON "approval_requests" ("status");
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "approval_requester_idx" ON "approval_requests" ("requester_id");
  `);

  console.log('✅ approval_requests table created successfully!');
  process.exit(0);
}

migrateApprovals().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
