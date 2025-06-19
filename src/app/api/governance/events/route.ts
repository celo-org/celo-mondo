import { sql } from 'drizzle-orm';
import 'server-only';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  if (!searchParams.has('chainId')) {
    return new Response(JSON.stringify({ error: 'Missing chainId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!searchParams.has('eventName')) {
    return new Response(JSON.stringify({ error: 'Missing eventName' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const query = sql`
    ${eventsTable.eventName} = ${searchParams.get('eventName')}
    AND ${eventsTable.chainId} = ${parseInt(searchParams.get('chainId')!, 10)}
  `;

  if (searchParams.has('proposalId')) {
    query.append(sql`
      AND ${eventsTable.topics}[2] = ${searchParams.get('proposalId')}
    `);
  }

  const events = await database.select().from(eventsTable).where(query).limit(1000);

  return new Response(JSON.stringify(events), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
