import { sql } from 'drizzle-orm';
import { eventsTable } from 'src/db/schema';

/**
 * Where an event row was ingested from. Webhook providers deliver in real time;
 * `cron` is the periodic backfill that scans the chain on a schedule.
 */
export type IngestSource = 'alchemy' | 'multibaas' | 'cron';

type WithChainAndIngestion<T> = T & {
  chainId: number;
  ingestedVia: Partial<Record<IngestSource, string>>;
};

/**
 * Stamps a batch of decoded events with their chainId and a per-provider
 * ingestion timestamp ({ [source]: ISO }) so the insert can record provenance.
 */
export function withIngestionMetadata<T extends object>(
  events: T[],
  chainId: number,
  source: IngestSource,
): WithChainAndIngestion<T>[] {
  const at = new Date().toISOString();
  return events.map((event) => ({ ...event, chainId, ingestedVia: { [source]: at } }));
}

/**
 * `onConflictDoUpdate({ set })` clause that accumulates providers without losing
 * the first arrival per provider. jsonb `a || b` is right-biased on key
 * collision, so `excluded || existing` keeps the existing (earliest) timestamp
 * for a provider already present while still adding any new provider keys.
 * `ingestedAt` is intentionally not updated, preserving first-seen time.
 */
export const ingestedViaConflictSet = {
  ingestedVia: sql`excluded."ingestedVia" || coalesce(${eventsTable.ingestedVia}, '{}'::jsonb)`,
};

/**
 * Renders an ingestedVia map for display, ordered by arrival time, e.g.
 * `alchemy (12:15:31), multibaas (12:17:40)`.
 */
export function formatIngestedVia(
  ingestedVia: Partial<Record<IngestSource, string>> | null | undefined,
): string {
  if (!ingestedVia) return '';
  return Object.entries(ingestedVia)
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([source, iso]) => `${source} (${iso.slice(11, 19)})`)
    .join(', ');
}
