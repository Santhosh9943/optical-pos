// src/db/index.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { config } from 'dotenv';
import * as schema from './schema';

// Load .env.local first, fallback to .env for standalone scripts (seed, CLI)
config({ path: '.env.local' });
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from './schema';
