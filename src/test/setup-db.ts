import { sql } from 'drizzle-orm';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import testDatabase, { applyMigrations, client, insertSeedData } from 'src/test/database';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

vi.mock('src/config/database', async () => {
  return { default: testDatabase, client };
});

const initialMigration = join(__dirname, '..', '..', 'drizzle', '0000_outgoing_patch.sql');
beforeAll(() => {
  writeFileSync(initialMigration, readFileSync(initialMigration).toString().replaceAll('-- ', ''));
});

beforeEach(async () => {
  await applyMigrations();
  await insertSeedData();
});

afterEach(async () => {
  await testDatabase.execute(sql`drop schema if exists public cascade`);
  await testDatabase.execute(sql`create schema public`);
  await testDatabase.execute(sql`drop schema if exists drizzle cascade`);
});

afterAll(async () => {
  client.close();
  writeFileSync(
    initialMigration,
    readFileSync(initialMigration).toString().replace(/^(.+)/gm, '-- $1'),
  );
});
