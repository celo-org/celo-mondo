import { and, eq, sql } from 'drizzle-orm';
import { type NextRequest } from 'next/server';
import 'server-only';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);

  if (!searchParams.has('chainId')) {
    return Response.json(
      { error: 'Missing chainId' },
      {
        status: 400,
      },
    );
  }
  if (!searchParams.has('eventName')) {
    return Response.json(
      { error: 'Missing eventName' },
      {
        status: 400,
      },
    );
  }

  const filters = [
    eq(eventsTable.eventName, searchParams.get('eventName')!),
    eq(eventsTable.chainId, parseInt(searchParams.get('chainId')!, 10)),
  ];
  if (searchParams.has('proposalId')) {
    filters.push(eq(sql`${eventsTable.topics}[2]`, searchParams.get('proposalId')!));
  }

  const events = await database
    .select()
    .from(eventsTable)
    .where(and(...filters))
    .limit(1000);

  return Response.json(events);
}
