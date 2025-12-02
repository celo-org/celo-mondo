/* eslint-disable no-console */
import 'dotenv/config';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import database from 'src/config/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Migration started ⌛');

  try {
    await migrate(database, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle') });
    console.log('Migration completed ✅');
  } finally {
    await database.$client.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed 🚨:', error);
    process.exit(1);
  });
