// scripts/run-sql-migration.ts
// Applies a hand-written, idempotent SQL migration file to DATABASE_URL.
// Usage: npx tsx scripts/run-sql-migration.ts scripts/migrations/<file>.sql

import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });
config();

/**
 * @description Executes the SQL file passed as the first CLI argument in a single round-trip.
 * @returns Resolves when the migration has been applied.
 */
async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: tsx scripts/run-sql-migration.ts <path-to.sql>');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const sqlText = readFileSync(file, 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(sqlText);
    console.log(`Applied ${file}`);
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
