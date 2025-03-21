import { fetchLogs } from '@viem/anvil';
import { beforeEach } from 'node:test';
import { afterEach } from 'vitest';
import { ANVIL_BASE_HOST, ANVIL_FORK_URL, FORK_BLOCK_NUMBER } from './constants';
import { pool, testClient } from './utils';

import '@testing-library/jest-dom/vitest';
import { logger } from 'src/utils/logger';

beforeEach(async () => {
  testClient.reset({
    jsonRpcUrl: ANVIL_FORK_URL,
    blockNumber: FORK_BLOCK_NUMBER,
  });
});

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
