import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function migrateNotifications() {
  console.log('🚀 Running notifications tables migration on Neon Postgres…');

  // 1. notifications table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "branch_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
      "recipient_id" text REFERENCES "user"("id") ON DELETE CASCADE,
      "target_role" varchar(50),
      "category" varchar(30) NOT NULL,
      "type" varchar(100) NOT NULL,
      "severity" varchar(20) DEFAULT 'medium' NOT NULL,
      "title" varchar(255) NOT NULL,
      "message" text NOT NULL,
      "metadata" jsonb,
      "action_url" text,
      "action_label" varchar(50),
      "dedup_key" varchar(255),
      "expires_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "notifications_org_idx" ON "notifications" ("organization_id");
    CREATE INDEX IF NOT EXISTS "notifications_branch_idx" ON "notifications" ("branch_id");
    CREATE INDEX IF NOT EXISTS "notifications_recipient_idx" ON "notifications" ("recipient_id");
    CREATE INDEX IF NOT EXISTS "notifications_category_idx" ON "notifications" ("category");
    CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");
    CREATE INDEX IF NOT EXISTS "notifications_dedup_idx" ON "notifications" ("dedup_key");
  `);

  // 2. notification_reads table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notification_reads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "notification_id" uuid NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "read_at" timestamp with time zone DEFAULT now() NOT NULL,
      "dismissed_at" timestamp with time zone
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "notification_user_read_unique_idx" ON "notification_reads" ("notification_id", "user_id");
    CREATE INDEX IF NOT EXISTS "notification_reads_user_idx" ON "notification_reads" ("user_id");
  `);

  // 3. notification_preferences table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notification_preferences" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "in_app_alerts" boolean DEFAULT true NOT NULL,
      "email_alerts" boolean DEFAULT true NOT NULL,
      "browser_push" boolean DEFAULT false NOT NULL,
      "low_stock_alerts" boolean DEFAULT true NOT NULL,
      "lab_order_reminders" boolean DEFAULT true NOT NULL,
      "payment_reminders" boolean DEFAULT true NOT NULL,
      "system_updates" boolean DEFAULT true NOT NULL,
      "sound_enabled" boolean DEFAULT false NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "notification_pref_user_org_idx" ON "notification_preferences" ("user_id", "organization_id");
  `);

  console.log('✅ notifications tables and indexes created successfully!');
  process.exit(0);
}

migrateNotifications().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
