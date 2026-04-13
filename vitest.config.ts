import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 60_000,
    retry: 2,
    reporters: ['verbose'],
    pool: 'forks',
    singleFork: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['demo/**'],
  },
});
