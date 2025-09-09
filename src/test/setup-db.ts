import { sql } from 'drizzle-orm';
import testDatabase, { applyMigrations, client, insertSeedData } from 'src/test/database';
import { afterAll, afterEach, beforeEach, vi } from 'vitest';

vi.mock('src/config/database', async () => {
  return { default: testDatabase, client };
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
});
