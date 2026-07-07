import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/d1/pulsify.ts',
  out: './drizzle/d1/pulsify',
  dialect: 'sqlite',
  verbose: true,
  strict: true,
});
