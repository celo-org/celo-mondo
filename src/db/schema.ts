import { sql } from 'drizzle-orm';
import {
  bigint,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  varchar,
} from 'drizzle-orm/pg-core';

export const chainsTable = pgTable('chains', {
  id: integer().primaryKey(),
  name: text().notNull(),
});

export const eventsTable = pgTable(
  'events',
  {
    chainId: integer().notNull(),
    eventName: text().notNull(),
    args: jsonb().notNull(),
    address: varchar({ length: 42 }).notNull(),
    topics: text().array().notNull(),
    data: text().notNull(),
    blockNumber: bigint({ mode: 'bigint' }).notNull(),
    transactionHash: varchar({ length: 66 }).notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.chainId], foreignColumns: [chainsTable.id] }).onDelete('restrict'),
    primaryKey({ columns: [table.eventName, table.transactionHash, table.chainId] }),

    index().on(table.blockNumber),
    index().on(table.eventName),
    index().on(table.chainId),
    index().on(sql`${table.topics}[2]`), // proposalId - pgArrays are 1-indexed
  ],
);

export const blocksProcessedTable = pgTable(
  'blocksProcessed',
  {
    chainId: integer().notNull(),
    eventName: text().notNull(),
    blockNumber: bigint({ mode: 'bigint' }).notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.chainId], foreignColumns: [chainsTable.id] }).onDelete('restrict'),
    primaryKey({ columns: [table.eventName, table.chainId] }),
  ],
);
