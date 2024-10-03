import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { logger } from 'src/utils/logger';

const DELEGATEES_JSON_DIR = path.resolve(__dirname, '../config/delegatees');
const DELEGATEES_LIST_PATH = path.resolve(__dirname, '../config/delegates.json');

async function main() {
  const list = JSON.parse(fs.readFileSync(DELEGATEES_LIST_PATH, 'utf-8'));
  const fileNames = fs
    .readdirSync(DELEGATEES_JSON_DIR)
    .filter((file) => path.extname(file) === '.json');

  for (const fileName of fileNames) {
    const delegateeMetadata = JSON.parse(
      fs.readFileSync(path.join(DELEGATEES_JSON_DIR, fileName), 'utf8'),
    );

    list[delegateeMetadata.address] = delegateeMetadata;
  }

  fs.writeFileSync(DELEGATEES_LIST_PATH, JSON.stringify(list, null, 2), 'utf-8');
}

main()
  .then(() => logger.info('Done combining delegatees metadata'))
  .catch((error) => logger.warn('Error combining delegatees metadata', error));
