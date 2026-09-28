import { pool } from '../src/db';

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding subscription columns to organizations table...');
    await client.query(`
      ALTER TABLE "organizations" 
      ADD COLUMN IF NOT EXISTS "plan_id" varchar(50) NOT NULL DEFAULT 'starter',
      ADD COLUMN IF NOT EXISTS "subscription_status" varchar(50) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS "subscription_period" varchar(20) DEFAULT 'monthly',
      ADD COLUMN IF NOT EXISTS "subscription_ends_at" timestamp with time zone,
      ADD COLUMN IF NOT EXISTS "has_completed_onboarding" boolean NOT NULL DEFAULT false;
    `);

    console.log('Creating subscriptions table and indexes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "plan_id" varchar(50) NOT NULL,
        "billing_cycle" varchar(20) NOT NULL DEFAULT 'monthly',
        "amount" numeric(12, 2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'INR',
        "razorpay_order_id" varchar(100),
        "razorpay_payment_id" varchar(100),
        "razorpay_signature" varchar(255),
        "status" varchar(50) NOT NULL DEFAULT 'created',
        "failure_reason" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "subscriptions_org_idx" ON "subscriptions"("organization_id");
      CREATE INDEX IF NOT EXISTS "subscriptions_order_idx" ON "subscriptions"("razorpay_order_id");
      CREATE INDEX IF NOT EXISTS "subscriptions_payment_idx" ON "subscriptions"("razorpay_payment_id");
    `);

    console.log('Migration completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
