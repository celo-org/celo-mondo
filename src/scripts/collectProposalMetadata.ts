import fs from 'fs';
import path from 'path';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { logger } from 'src/utils/logger';

const PROPOSALS_OUT_PATH = path.resolve(__dirname, '../config/proposals.json');

async function main() {
  logger.info('Fetching list of proposals');

  const proposals = await fetchProposalsFromRepo([], true);

  logger.info(`Writing proposals to file ${PROPOSALS_OUT_PATH}`);
  fs.writeFileSync(PROPOSALS_OUT_PATH, JSON.stringify(proposals, null, 2), 'utf8');
}

main()
  .then(() => logger.info('Done fetching proposals'))
  .catch((error) => logger.warn('Error fetching proposals', error));
