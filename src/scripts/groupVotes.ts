/* eslint-disable no-console */
import { VALIDATOR_GROUPS } from 'src/config/validators';
import { fetchDelegateeHistory } from 'src/features/delegation/hooks/useDelegateeHistory';
import { sleep } from 'src/utils/async';
import { logger } from 'src/utils/logger';
import { objKeys, objLength } from 'src/utils/objects';

// Prints the number of governance proposals each validator group has voted on
async function main() {
  const accountToCount: Record<string, number> = {};
  const valAddrs = objKeys(VALIDATOR_GROUPS);
  for (const addr of valAddrs) {
    const votes = await fetchDelegateeHistory(addr as Address);
    await sleep(500);
    accountToCount[addr] ||= 0;
    accountToCount[addr] += objLength(votes);
  }
  const sorted = Object.entries(accountToCount).sort((a, b) => b[1] - a[1]);
  for (const acc of sorted) {
    console.log(acc[0], acc[1]);
  }
}

main()
  .then(() => logger.info('Done'))
  .catch((error) => logger.warn('Error', error));
