import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proposalId = parseInt(id, 10);

  if (isNaN(proposalId)) {
    return NextResponse.json({ error: 'Invalid proposal ID' }, { status: 400 });
  }

  // Query for ProposalApproved event
  const approvalEvent = await database
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.eventName, 'ProposalApproved'),
        eq(sql`(${eventsTable.args}->>'proposalId')::bigint`, proposalId),
      ),
    )
    .limit(1);
  console.info(approvalEvent);
  if (approvalEvent.length > 0) {
    const event = approvalEvent[0];
    return NextResponse.json({
      approved: true,
      blockNumber: Number(event.blockNumber), // Block number where approval occurred
    });
  }

  return NextResponse.json({
    approved: false,
  });
}
