import { fetchLogs } from '@viem/anvil';
import { beforeEach } from 'node:test';
import { afterEach } from 'vitest';
import { ANVIL_BASE_HOST, ANVIL_FORK_URL, FORK_BLOCK_NUMBER } from './constants';
import { pool, testClient } from './utils';

beforeEach(async () => {
  testClient.reset({
    jsonRpcUrl: ANVIL_FORK_URL,
    blockNumber: FORK_BLOCK_NUMBER,
  });
});

afterEach(async (context) => {
  context.onTestFailed(async () => {
    // If a test fails, you can fetch and print the logs of your anvil instance.
    const logs = await fetchLogs(`http://${ANVIL_BASE_HOST}`, pool);
    // Only print the 20 most recent log messages.
    console.log(...logs.slice(-20));
  });
});
