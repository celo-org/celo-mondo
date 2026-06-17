import { fetchLogs } from '@viem/anvil';
import { afterEach } from 'vitest';
import { ANVIL_BASE_HOST } from './constants';
import { pool } from './utils';

import '@testing-library/jest-dom/vitest';
import { logger } from 'src/utils/logger';

// @ts-expect-error
BigInt.toJSON = function () {
  return this.toString();
};

// NOTE: a per-test `testClient.reset()` hook used to live here but was imported
// from `node:test`, so vitest never ran it. It has always been a no-op; the
// shared anvil instance set up in globalSetup is what tests rely on. Re-adding a
// real reset here resets the fork and breaks anvil/setup.test.ts.

afterEach(async (context) => {
  context.onTestFailed(async () => {
    // If a test fails, you can fetch and print the logs of your anvil instance.
    await fetchLogs(`http://${ANVIL_BASE_HOST}`, pool)
      .then((logs) => {
        // Only print the 20 most recent log messages.
        logger.debug(...logs.slice(-20));
      })
      .catch((err) => {
        logger.error(err);
      });
  });
});
