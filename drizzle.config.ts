import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env.local first, then fallback to .env
config({ path: '.env.local' });
config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
