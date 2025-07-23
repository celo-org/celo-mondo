import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import * as schema from '../db/schema';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = dirname(__filename); // get the name of the directory

export const client = new PGlite();
const testDatabase = drizzle({ client, schema });

export async function applyMigrations() {
  await migrate(testDatabase, { migrationsFolder: join(__dirname, '..', '..', 'drizzle') });
}
export async function insertSeedData() {
  await testDatabase.insert(schema.chainsTable).values({ id: TEST_CHAIN_ID, name: 'mainnet' });
}

export const TEST_CHAIN_ID = 42220;
export default testDatabase;
