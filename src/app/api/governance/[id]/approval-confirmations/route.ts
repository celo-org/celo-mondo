/* eslint no-console: 0 */

import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import database from 'src/config/database';
import { approvalsTable } from 'src/db/schema';
import { celoPublicClient } from 'src/utils/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/governance/[id]/approval-confirmations
 * Returns the list of approvers who have confirmed the given proposal
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
  }

  try {
    // Query the approvals table for all confirmations of this proposal
    const approvals = await database
      .select({
        approver: approvalsTable.approver,
        multisigTxId: approvalsTable.multisigTxId,
        confirmedAt: approvalsTable.confirmedAt,
        blockNumber: approvalsTable.blockNumber,
        transactionHash: approvalsTable.transactionHash,
      })
      .from(approvalsTable)
      .where(
        and(
          eq(approvalsTable.proposalId, proposalId),
          eq(approvalsTable.chainId, celoPublicClient.chain.id),
        ),
      )
      .orderBy(approvalsTable.blockNumber);

    return NextResponse.json({
      proposalId,
      approvals: approvals.map((approval) => ({
        approver: approval.approver,
        multisigTxId: Number(approval.multisigTxId),
        confirmedAt: approval.confirmedAt,
        blockNumber: Number(approval.blockNumber),
        transactionHash: approval.transactionHash,
      })),
      count: approvals.length,
    });
  } catch (error) {
    console.error(`Error fetching approvals for proposal ${proposalId}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch approvals', details: (error as Error).message },
      { status: 500 },
    );
  }
}
