import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: ['./src/test/anvil/setup.ts'],
  },
});
