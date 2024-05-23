import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { fetchProposalVoters } from 'src/features/governance/hooks/useProposalVoters';
import { ProposalMetadata, ProposalStage } from 'src/features/governance/types';
import { sleep } from 'src/utils/async';
import { logger } from 'src/utils/logger';

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const PROPOSALS_OUT_PATH = path.resolve(__dirname, '../config/proposals.json');
const MIN_PROPOSAL_ID_VOTES_FETCH = 150;

async function main() {
  let cachedProposals: ProposalMetadata[] = [];
  if (fs.existsSync(PROPOSALS_OUT_PATH)) {
    logger.info(`Reading cached proposals from file ${PROPOSALS_OUT_PATH}`);
    cachedProposals = JSON.parse(fs.readFileSync(PROPOSALS_OUT_PATH, 'utf8'));
  }

  logger.info('Fetching list of proposals');
  const proposals = await fetchProposalsFromRepo([], true);

  logger.info('Fetching vote totals');
  for (const proposal of proposals) {
    if (!proposal.id || proposal.stage < ProposalStage.Referendum) continue;

    if (proposal.id < MIN_PROPOSAL_ID_VOTES_FETCH) {
      const cached = cachedProposals.find((p) => p.id === proposal.id);
      if (cached) {
        logger.info(`Using cached votes for old proposal ${proposal.id}`);
        proposal.votes = cached.votes;
        continue;
      }
    }

    try {
      logger.info(`Fetching votes for proposal ${proposal.id}`);
      const { totals } = await fetchProposalVoters(proposal.id);
      await sleep(300); // for rate limits
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
