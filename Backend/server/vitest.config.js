import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,   // one in-memory mongo, files run in order
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
