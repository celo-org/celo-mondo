import { fetchLogs } from '@viem/anvil';
import { afterEach } from 'vitest';
import { ANVIL_BASE_HOST } from './constants';
import { pool } from './utils';

afterEach(async (context) => {
  context.onTestFailed(async () => {
    // If a test fails, you can fetch and print the logs of your anvil instance.
    const logs = await fetchLogs(`http://${ANVIL_BASE_HOST}`, pool);
    // Only print the 20 most recent log messages.
    console.log(...logs.slice(-20));
  });
});
