import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: ['./drizzle/schema.ts', './drizzle/schema-phase2.ts'],
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/fushuma_governance',
  },
} satisfies Config;

