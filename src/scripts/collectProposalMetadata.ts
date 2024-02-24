import fs from 'fs';
import path from 'path';
import { ProposalStage } from 'src/features/governance/contractTypes';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { fetchProposalVoters } from 'src/features/governance/useProposalVoters';
import { sleep } from 'src/utils/async';
import { logger } from 'src/utils/logger';

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const PROPOSALS_OUT_PATH = path.resolve(__dirname, '../config/proposals.json');

async function main() {
  logger.info('Fetching list of proposals');
  const proposals = await fetchProposalsFromRepo([], true);

  logger.info('Fetching vote totals');
  for (const proposal of proposals) {
    if (!proposal.id || proposal.stage < ProposalStage.Referendum) continue;
    try {
      logger.info(`Fetching votes for proposal ${proposal.id}`);
      const { totals } = await fetchProposalVoters(proposal.id);
      await sleep(250); // for rate limits
      proposal.votes = totals;
    } catch (error) {
      logger.error(`Error fetching votes for proposal ${proposal.id}`, error);
    }
  }

  logger.info(`Writing proposals to file ${PROPOSALS_OUT_PATH}`);
  fs.writeFileSync(PROPOSALS_OUT_PATH, JSON.stringify(proposals, null, 2), 'utf8');
}

main()
  .then(() => logger.info('Done fetching proposals'))
  .catch((error) => logger.warn('Error fetching proposals', error));
