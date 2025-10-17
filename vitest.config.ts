import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    globalSetup: ['./src/test/globalSetup.ts'],
    setupFiles: [
      './src/test/globalMocks.ts',
      './src/test/setup-db.ts',
      './src/test/anvil/setup.ts',
      './src/vendor/polyfill.ts',
    ],
    environment: 'happy-dom',
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
});
