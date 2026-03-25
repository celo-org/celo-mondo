import { governanceABI } from '@celo/abis';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';
import { extractFunctionSignature } from 'src/features/governance/utils/transactionDecoder';
import { celoPublicClient } from 'src/utils/client';
import { fromFixidity } from 'src/utils/numbers';

export async function POST(request: NextRequest) {
  try {
    const { proposalId } = (await request.json()) as { proposalId: number };

    if (!proposalId || typeof proposalId !== 'number') {
      return NextResponse.json({ error: 'Invalid proposalId' }, { status: 400 });
    }

    // Only backfill if not already set
    const existing = (
      await database
        .select({ constitutionThreshold: proposalsTable.constitutionThreshold })
        .from(proposalsTable)
        .where(eq(proposalsTable.id, proposalId))
        .limit(1)
    ).at(0);

    if (existing?.constitutionThreshold) {
      return NextResponse.json({ status: 'already_set' });
    }

    // Compute threshold from on-chain data (never trust client input)
    const proposal = await celoPublicClient.readContract({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'getProposal',
      args: [BigInt(proposalId)],
    });
    const transactionCount = Number(proposal[3]);

    if (transactionCount === 0) {
      return NextResponse.json({ status: 'no_transactions' });
    }

    const txResults = await celoPublicClient.multicall({
      allowFailure: false,
      contracts: Array.from({ length: transactionCount }, (_, i) => ({
        abi: governanceABI,
        address: Addresses.Governance,
        functionName: 'getProposalTransaction' as const,
        args: [BigInt(proposalId), BigInt(i)],
      })),
    });

    const thresholdResults = await celoPublicClient.multicall({
      allowFailure: false,
      contracts: (txResults as [bigint, `0x${string}`, `0x${string}`][]).map(
        ([, destination, data]) => ({
          abi: governanceABI,
          address: Addresses.Governance,
          functionName: 'getConstitution' as const,
          args: [destination, extractFunctionSignature(data)],
        }),
      ),
    });

    const maxThreshold = Math.max(...thresholdResults.map((t) => fromFixidity(t as bigint)));

    await database
      .update(proposalsTable)
      .set({ constitutionThreshold: maxThreshold.toString() })
      .where(eq(proposalsTable.id, proposalId));

    return NextResponse.json({ status: 'updated', constitutionThreshold: maxThreshold });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to backfill threshold' }, { status: 500 });
  }
}
