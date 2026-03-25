import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import database from 'src/config/database';
import { proposalsTable } from 'src/db/schema';

export async function POST(request: NextRequest) {
  try {
    const { proposalId, constitutionThreshold } = (await request.json()) as {
      proposalId: number;
      constitutionThreshold: number;
    };

    if (!proposalId || typeof constitutionThreshold !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
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

    await database
      .update(proposalsTable)
      .set({ constitutionThreshold: constitutionThreshold.toString() })
      .where(eq(proposalsTable.id, proposalId));

    return NextResponse.json({ status: 'updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to backfill threshold' }, { status: 500 });
  }
}
