import 'dotenv/config';

/* eslint no-console: 0 */
import { reconcileGovernanceRepoStatus } from 'src/features/governance/reconcileGovernanceRepoStatus';

reconcileGovernanceRepoStatus()
  .then(() => {
    console.log('✅ Governance repo reconcile complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
