import { db } from '../src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🚀 Creating super_admin_otps table in PostgreSQL...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS super_admin_otps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      consumed_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS super_admin_otps_email_idx ON super_admin_otps (email);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS super_admin_otps_created_at_idx ON super_admin_otps (created_at);
  `);

  console.log('✅ super_admin_otps table and indexes successfully verified!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
