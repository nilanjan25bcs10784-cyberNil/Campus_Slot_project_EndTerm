import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 600000, // 10 minutes for binary download
    teardownTimeout: 60000,
    fileParallelism: false,
  },
});
