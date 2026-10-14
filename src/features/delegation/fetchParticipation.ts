import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import {
  PARTICIPATION_WINDOW,
  Participation,
  scoreParticipation,
} from 'src/features/delegation/participation';
import { ProposalStage } from 'src/features/governance/types';

// Scores every account that voted on any of the newest closed proposals. Accounts
// missing from the result voted on none of them. Proposals still in referendum are
// left out so nobody is penalised for a vote they can still cast.
export async function fetchParticipation(chainId: number): Promise<AddressTo<Participation>> {
  const rows = await database.execute<{ account: Address; ranks: number[] }>(sql`
    WITH ranked AS (
      SELECT id, row_number() OVER (ORDER BY "dequeuedAt" DESC, id DESC) AS rank
      FROM ${proposalsTable}
      WHERE "chainId" = ${chainId}
        AND "dequeuedAt" IS NOT NULL
        AND stage <> ${ProposalStage.Referendum}
    ),
    votes AS (
      SELECT DISTINCT lower('0x' || right(topics[3], 40)) AS account,
             ('x' || right(topics[2], 16))::bit(64)::bigint AS "proposalId"
      FROM ${eventsTable}
      WHERE "chainId" = ${chainId}
        AND "eventName" IN ('ProposalVoted', 'ProposalVotedV2')
    )
    SELECT account, array_agg(rank::int ORDER BY rank) AS ranks
    FROM votes
    JOIN ranked ON ranked.id = votes."proposalId"
    WHERE rank <= ${PARTICIPATION_WINDOW}
    GROUP BY account
  `);

  const participation: AddressTo<Participation> = {};
  for (const { account, ranks } of rows) participation[account] = scoreParticipation(ranks);
  return participation;
}
