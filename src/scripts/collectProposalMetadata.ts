import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fetchProposalsFromRepo } from 'src/features/governance/fetchFromRepository';
import { logger } from 'src/utils/logger';
import { fileURLToPath } from 'url';
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const PROPOSALS_OUT_PATH = path.resolve(__dirname, '../config/proposals.json');

async function main() {
  logger.info('Fetching list of proposals');
  const proposals = await fetchProposalsFromRepo([], true);

  logger.info(`Writing proposals to file ${PROPOSALS_OUT_PATH}`);
  fs.writeFileSync(PROPOSALS_OUT_PATH, JSON.stringify(proposals, null, 2), 'utf8');
}

main()
  .then(() => {
    logger.info('Done fetching proposals');
    process.exit(0);
  })
  .catch((error) => {
    logger.warn('Error fetching proposals', error);
    process.exit(1);
  });
