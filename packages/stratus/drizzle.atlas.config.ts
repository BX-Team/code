import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/d1/atlas.ts',
  out: './drizzle/d1/atlas',
  dialect: 'sqlite',
  verbose: true,
  strict: true,
});
