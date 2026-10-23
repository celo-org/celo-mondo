import { sql } from 'drizzle-orm';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import { PARTICIPATION_WINDOW, ParticipationData } from 'src/features/delegation/participation';
import { ProposalStage } from 'src/features/governance/types';

// For every account that still holds a ballot on one of the newest closed proposals,
// the ranks of those proposals. Accounts missing from the result voted on none of
// them. A ballot counts only if the account's last vote event on the proposal was a
// cast, not a revoke. Proposals still in referendum are left out so nobody is
// penalised for a vote they can still cast.
export async function fetchParticipation(chainId: number): Promise<ParticipationData> {
  const rows = await database.execute<{
    account: Address;
    ranks: number[];
    closedProposals: number;
  }>(sql`
    WITH ranked AS (
      SELECT id, row_number() OVER (ORDER BY "dequeuedAt" DESC, id DESC) AS rank
      FROM ${proposalsTable}
      WHERE "chainId" = ${chainId}
        AND "dequeuedAt" IS NOT NULL
        AND stage <> ${ProposalStage.Referendum}
    ),
    ballots AS (
      -- Last vote event per account and proposal; logIndex breaks same-block ties
      SELECT DISTINCT ON (account, "proposalId") account, "proposalId", "eventName"
      FROM (
        SELECT lower('0x' || right(topics[3], 40)) AS account,
               ('x' || right(topics[2], 16))::bit(64)::bigint AS "proposalId",
               "eventName", "blockNumber", "logIndex"
        FROM ${eventsTable}
        WHERE "chainId" = ${chainId}
          AND "eventName" IN (
            'ProposalVoted', 'ProposalVotedV2', 'ProposalVoteRevoked', 'ProposalVoteRevokedV2'
          )
      ) votes
      ORDER BY account, "proposalId", "blockNumber" DESC, "logIndex" DESC
    )
    SELECT account,
           array_agg(rank::int ORDER BY rank) AS ranks,
           (SELECT count(*)::int FROM ranked) AS "closedProposals"
    FROM ballots
    JOIN ranked ON ranked.id = ballots."proposalId"
    WHERE rank <= ${PARTICIPATION_WINDOW}
      AND "eventName" IN ('ProposalVoted', 'ProposalVotedV2')
    GROUP BY account
  `);

  const votedRanks: AddressTo<number[]> = {};
  for (const { account, ranks } of rows) votedRanks[account] = ranks;
  const closedProposals = rows[0]?.closedProposals ?? (await countClosedProposals(chainId));
  return { closedProposals, votedRanks };
}

// Only needed when nobody voted in the window, which leaves no row to carry the count
async function countClosedProposals(chainId: number): Promise<number> {
  const [{ count }] = await database.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count FROM ${proposalsTable}
    WHERE "chainId" = ${chainId}
      AND "dequeuedAt" IS NOT NULL
      AND stage <> ${ProposalStage.Referendum}
  `);
  return count;
}
