import 'dotenv/config';

/* eslint no-console: 0 */
import { reconcileGovernanceRepoStatus } from 'src/features/governance/reconcileGovernanceRepoStatus';
import { Chain, createPublicClient, http, PublicClient, Transport } from 'viem';
import { celo } from 'viem/chains';

const archiveClient = createPublicClient({
  chain: celo,
  transport: http(process.env.PRIVATE_NO_RATE_LIMITED_NODE!),
}) as PublicClient<Transport, Chain>;

reconcileGovernanceRepoStatus(new Date(), archiveClient)
  .then(() => {
    console.log('✅ Governance repo reconcile complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
