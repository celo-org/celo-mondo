import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { GCTime, StaleTime } from 'src/config/consts';
import database from 'src/config/database';
import { eventsTable, proposalsTable } from 'src/db/schema';
import {
  decodeTransaction,
  getProposalTransactions,
} from 'src/features/governance/utils/transactionDecoder';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const shouldDecodeTransaction = new URL(request.url).searchParams.get('decode') === 'true';
  const headers = new Headers();
  headers.append(
    'Cache-Control',
    `public,max-age=${GCTime.Default / 1000}, stale-while-revalidate=${StaleTime.Default / 1000}`,
  );

  try {
    const { id } = await params;

    // Parse the proposal ID
    let proposal: typeof proposalsTable.$inferSelect;
    const matches = new RegExp(/^(cgp-)?(\d+)$/).exec(id);
    if (matches?.[1] === 'cgp-') {
      // For CGP proposals, we need to find the on-chain proposal ID
      // This would require a lookup in the database
      const cgpId = matches[2]!;
      proposal = (
        await database
          .select()
          .from(proposalsTable)
          .where(eq(proposalsTable.cgp, parseInt(cgpId, 10)))
          .orderBy(sql`${proposalsTable.id} DESC`)
          .limit(1)
      ).at(0)!;
      if (!proposal) {
        return NextResponse.json(
          { error: `Couldnt find proposal with cgp ${cgpId}` },
          { status: 404 },
        );
      }
    } else if (matches?.[2]) {
      proposal = (
        await database
          .select()
          .from(proposalsTable)
          .where(eq(proposalsTable.id, parseInt(matches[2], 10)))
          .orderBy(sql`${proposalsTable.id} DESC`)
          .limit(1)
      ).at(0)!;
    } else {
      return NextResponse.json({ error: 'Invalid proposal ID format' }, { status: 400 });
    }

    const earliestBlockNumber = (
      await database
        .select()
        .from(eventsTable)
        .where(
          and(
            eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposal.id),
            eq(eventsTable.eventName, 'ProposalQueued'),
          ),
        )
        .limit(1)
    ).at(0)!.blockNumber;
    // Fetch and decode transactions
    const transactions = await getProposalTransactions(
      proposal.id,
      proposal.transactionCount || 0,
      earliestBlockNumber,
    );

    if (!shouldDecodeTransaction) {
      return NextResponse.json(transactions, { headers });
    }

    // Decode each transaction
    const decodedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const decoded = await decodeTransaction(transaction);

        return {
          ...transaction,
          decoded,
        };
      }),
    );

    return NextResponse.json(decodedTransactions, { headers });
  } catch (error) {
    console.error('Error fetching proposal transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal transactions' }, { status: 500 });
  }
}
