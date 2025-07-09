'use server';

import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';

export async function fetchProposals(chainId: number) {
  return database
    .select()
    .from(proposalsTable)
    .where(sql`${proposalsTable.chainId} = ${chainId}`)
    .orderBy(sql`${proposalsTable.id} DESC`);
}
