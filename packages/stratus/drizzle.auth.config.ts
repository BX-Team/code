import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/d1/auth.ts',
  out: './drizzle/d1/auth',
  dialect: 'sqlite',
  verbose: true,
  strict: true,
});
