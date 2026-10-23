/* eslint no-console: 0 */
import { governanceABI } from '@celo/abis';
import { and, eq, gte, inArray, lte, max, or, sql } from 'drizzle-orm';
import { EXECUTION_STAGE_EXPIRY_TIME, REFERENDUM_STAGE_EXPIRY_TIME } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import {
  fetchGovernanceRepoStatus,
  GovernanceStatusUpdate,
  triggerGovernanceRepoStatusUpdate,
} from 'src/features/governance/syncGovernanceRepoStatus';
import { ProposalMetadataStatus, ProposalStage } from 'src/features/governance/types';
import { celoPublicClient } from 'src/utils/client';
import { unixTimestampToISOString } from 'src/utils/time';
import { celo } from 'viem/chains';

const HOUR_MS = 60 * 60 * 1000;
// A proposal settles within ten days of being dequeued, so a month covers every
// recent outcome and leaves weeks of daily retries for a dispatch that failed.
const LOOKBACK_MS = 30 * 24 * HOUR_MS;
// The execution event reaches the database on the hourly backfill. Until it has
// had time to land, an executed proposal still looks expired here.
const SETTLE_MS = 6 * HOUR_MS;

// Adopted (a zero-transaction proposal that passed) has no counterpart in the
// governance repo: its only successful status, EXECUTED, is validated there against
// a ProposalExecuted event that such a proposal never emits.
const STAGE_TO_STATUS: Partial<Record<ProposalStage, ProposalMetadataStatus>> = {
  [ProposalStage.Executed]: ProposalMetadataStatus.EXECUTED,
  [ProposalStage.Expiration]: ProposalMetadataStatus.EXPIRED,
  [ProposalStage.Rejected]: ProposalMetadataStatus.REJECTED,
};

interface SettledProposal {
  id: number;
  cgp: number;
  stage: ProposalStage;
  executedAt: string | null;
}

/**
 * Pushes the outcome of recently settled proposals to the governance repository.
 * Meant to run against the production database.
 *
 * Reads the status each CGP currently carries there and dispatches an update only
 * when it differs, so the daily run is idempotent and a failed dispatch is simply
 * retried the next day.
 */
export async function reconcileGovernanceRepoStatus(now = new Date()): Promise<void> {
  const since = new Date(now.getTime() - LOOKBACK_MS).toISOString();
  const settledBefore = new Date(
    now.getTime() - REFERENDUM_STAGE_EXPIRY_TIME - EXECUTION_STAGE_EXPIRY_TIME - SETTLE_MS,
  ).toISOString();

  const proposals: SettledProposal[] = await database
    .select({
      id: proposalsTable.id,
      cgp: proposalsTable.cgp,
      stage: proposalsTable.stage,
      executedAt: proposalsTable.executedAt,
    })
    .from(proposalsTable)
    .where(
      and(
        eq(proposalsTable.chainId, celo.id),
        gte(proposalsTable.dequeuedAt, since),
        or(
          eq(proposalsTable.stage, ProposalStage.Executed),
          and(
            inArray(proposalsTable.stage, [ProposalStage.Expiration, ProposalStage.Rejected]),
            lte(proposalsTable.dequeuedAt, settledBefore),
          ),
        ),
      ),
    );

  console.log(`Found ${proposals.length} settled proposals dequeued since ${since}`);
  if (proposals.length === 0) return;

  // A resubmitted CGP keeps its earlier attempts in the table, chained by ascending
  // id, so only the highest id for a CGP may speak for it. If that attempt is still
  // running, an earlier outcome must not be reported either.
  const currentAttempts = new Map(
    (
      await database
        .select({ cgp: proposalsTable.cgp, id: max(proposalsTable.id) })
        .from(proposalsTable)
        .where(
          and(
            eq(proposalsTable.chainId, celo.id),
            inArray(proposalsTable.cgp, [...new Set(proposals.map((p) => p.cgp))]),
          ),
        )
        .groupBy(proposalsTable.cgp)
    ).map((row) => [row.cgp, row.id]),
  );
  const chain = new ChainLookup();

  for (const proposal of proposals) {
    const status = STAGE_TO_STATUS[proposal.stage];
    if (!status) continue;
    if (currentAttempts.get(proposal.cgp) !== proposal.id) {
      console.log(`Proposal ${proposal.id} is an earlier attempt of CGP ${proposal.cgp}, skipping`);
      continue;
    }

    try {
      const current = await fetchGovernanceRepoStatus(proposal.cgp);
      if (current === null || current.status === status) continue;
      if (current.status === ProposalMetadataStatus.EXECUTED) {
        console.log(`⚠️  CGP ${proposal.cgp} is executed in the governance repo, leaving it alone`);
        continue;
      }
      if (current.proposalId !== null && current.proposalId > proposal.id) {
        console.log(
          `CGP ${proposal.cgp} already points at proposal ${current.proposalId}, skipping`,
        );
        continue;
      }
      // The hourly backfill may not have imported a resubmission yet, so ask the chain.
      if (await chain.hasNewerAttempt(proposal.cgp, proposal.id)) {
        console.log(`CGP ${proposal.cgp} has a newer attempt on chain, skipping`);
        continue;
      }

      const update = await toUpdate(proposal, status);
      if (!update) {
        console.log(`⚠️  Proposal ${proposal.id} is executed without an execution event, skipping`);
        continue;
      }
      await triggerGovernanceRepoStatusUpdate(update);
    } catch (error) {
      // Leave it for the next run rather than stopping the loop.
      console.error(`❌ Could not reconcile proposal ${proposal.id}:`, error);
    }
  }
}

async function toUpdate(
  proposal: SettledProposal,
  status: ProposalMetadataStatus,
): Promise<GovernanceStatusUpdate | null> {
  const base = { cgpNumber: proposal.cgp, onchainId: proposal.id };
  if (status === ProposalMetadataStatus.EXECUTED) {
    const executedAt = proposal.executedAt ?? (await executedAtFromEvent(proposal.id));
    return executedAt ? { ...base, status, executedAt } : null;
  }
  if (status === ProposalMetadataStatus.EXPIRED || status === ProposalMetadataStatus.REJECTED) {
    return { ...base, status };
  }
  return null;
}

/**
 * A backfill that stored the ProposalExecuted event but died before updating the
 * proposal row leaves the stage at Executed with no execution time. The event's
 * block still tells when it happened.
 */
async function executedAtFromEvent(proposalId: number): Promise<string | null> {
  const [event] = await database
    .select({ blockNumber: eventsTable.blockNumber })
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.chainId, celo.id),
        eq(eventsTable.eventName, 'ProposalExecuted'),
        eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, BigInt(proposalId)),
      ),
    )
    .limit(1);
  if (!event) return null;
  const block = await celoPublicClient.getBlock({ blockNumber: event.blockNumber });
  return unixTimestampToISOString(Number(block.timestamp));
}

/** Reads the queue and dequeue once per run and the description URLs on demand. */
class ChainLookup {
  private liveIds: Promise<bigint[]> | null = null;
  private cgpById = new Map<bigint, Promise<number>>();

  async hasNewerAttempt(cgp: number, afterId: number): Promise<boolean> {
    this.liveIds ??= this.fetchLiveIds();
    const newerIds = (await this.liveIds).filter((id) => id > BigInt(afterId));
    for (const id of newerIds) {
      this.cgpById.set(id, this.cgpById.get(id) ?? this.fetchCgp(id));
      if ((await this.cgpById.get(id)) === cgp) return true;
    }
    return false;
  }

  private async fetchLiveIds(): Promise<bigint[]> {
    const [[queued], dequeued] = await Promise.all([
      celoPublicClient.readContract({
        address: Addresses.Governance,
        abi: governanceABI,
        functionName: 'getQueue',
      }),
      celoPublicClient.readContract({
        address: Addresses.Governance,
        abi: governanceABI,
        functionName: 'getDequeue',
      }),
    ]);
    return [...queued, ...dequeued];
  }

  private async fetchCgp(id: bigint): Promise<number> {
    const [, , , , descriptionUrl] = await celoPublicClient.readContract({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getProposal',
      args: [id],
    });
    return parseInt(descriptionUrl.match(/cgp-(\d+)\.md/i)?.[1] ?? '0', 10);
  }
}
