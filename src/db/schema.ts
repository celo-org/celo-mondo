import { governanceABI, multiSigABI } from '@celo/abis';
import { sql } from 'drizzle-orm';
import {
  bigint,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { ProposalStage, VoteType } from 'src/features/governance/types';
import { GetContractEventsParameters } from 'viem';

export const chainsTable = pgTable('chains', {
  id: integer().primaryKey(),
  name: text().notNull(),
});

export const eventsTable = pgTable(
  'events',
  {
    chainId: integer().notNull(),
    eventName: text()
      .notNull()
      .$type<
        | GetContractEventsParameters<typeof governanceABI>['eventName']
        | GetContractEventsParameters<typeof multiSigABI>['eventName']
      >(),
    args: jsonb().notNull(),
    address: varchar({ length: 42 }).notNull(),
    topics: text().array().notNull().$type<[signature: `0x${string}`, ...args: `0x${string}`[]]>(),
    data: text().notNull().$type<`0x${string}`>(),
    blockNumber: numeric({ mode: 'bigint' }).notNull(),
    transactionHash: varchar({ length: 66 }).notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.chainId], foreignColumns: [chainsTable.id] }).onDelete('restrict'),
    primaryKey({ columns: [table.eventName, table.transactionHash, table.chainId] }),

    index().on(table.blockNumber),
    index().on(table.eventName),
    index().on(table.chainId),
    // https://www.postgresql.org/docs/current/gin.html#GIN-INTRO - suited for array columns indexing
    index('events_topics_proposalId_index').using('gin', sql`${table.topics}[2]`), // proposalId - pgArrays are 1-indexed
  ],
);

export const blocksProcessedTable = pgTable(
  'blocksProcessed',
  {
    chainId: integer().notNull(),
    eventName: text().notNull(),
    blockNumber: numeric({ mode: 'bigint' }).notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.chainId], foreignColumns: [chainsTable.id] }).onDelete('restrict'),
    primaryKey({ columns: [table.eventName, table.chainId] }),
  ],
);

export const proposalsTable = pgTable(
  'proposals',
  {
    chainId: integer().notNull(),
    id: bigint({ mode: 'number' }).notNull(),
    pastId: bigint({ mode: 'number' }),
    stage: integer().notNull().$type<ProposalStage>(),
    cgp: bigint({ mode: 'number' }).notNull(),
    url: text(),
    cgpUrl: text(), // url in repo
    cgpUrlRaw: text(), // for downloading content
    title: text().notNull(),
    author: text().notNull(),
    timestamp: integer().notNull(),
    proposer: text(),
    deposit: numeric({ mode: 'bigint' }),
    networkWeight: numeric({ mode: 'bigint' }),
    transactionCount: integer(),
    queuedAt: timestamp({ mode: 'string' }),
    queuedAtBlockNumber: numeric({ mode: 'bigint' }),
    dequeuedAt: timestamp({ mode: 'string' }),
    dequeuedAtBlockNumber: numeric({ mode: 'bigint' }),
    approvedAt: timestamp({ mode: 'string' }),
    approvedAtBlockNumber: numeric({ mode: 'bigint' }),
    executedAt: timestamp({ mode: 'string' }),
    executedAtBlockNumber: numeric({ mode: 'bigint' }),
  },
  (table) => [
    foreignKey({ columns: [table.chainId], foreignColumns: [chainsTable.id] }).onDelete('restrict'),
    foreignKey({
      columns: [table.pastId, table.chainId],
      foreignColumns: [table.id, table.chainId],
    }).onDelete('cascade'),
    primaryKey({ columns: [table.id, table.chainId] }),
  ],
);
export type Proposal = typeof proposalsTable.$inferSelect;

export const VoteTypeEnum = pgEnum('voteType', [
  VoteType.Abstain,
  VoteType.No,
  VoteType.None,
  VoteType.Yes,
]);
export const votesTable = pgTable(
  'votes',
  {
    chainId: integer().notNull(),
    type: VoteTypeEnum().notNull(),
    count: numeric({ mode: 'bigint' }).notNull(),
    proposalId: bigint({ mode: 'number' }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.proposalId, table.chainId],
      foreignColumns: [proposalsTable.id, proposalsTable.chainId],
    }).onDelete('cascade'),
    primaryKey({ columns: [table.chainId, table.type, table.proposalId] }),
  ],
);

export const approvalsTable = pgTable(
  'approvals',
  {
    chainId: integer().notNull(),
    proposalId: bigint({ mode: 'number' }).notNull(),
    multisigTxId: bigint({ mode: 'number' }).notNull(),
    approver: varchar({ length: 42 }).notNull(),
    confirmedAt: integer().notNull(),
    blockNumber: numeric({ mode: 'bigint' }).notNull(),
    transactionHash: varchar({ length: 66 }).notNull(),
  },
  (table) => [
    foreignKey({ columns: [table.chainId], foreignColumns: [chainsTable.id] }).onDelete('restrict'),
    foreignKey({
      columns: [table.proposalId, table.chainId],
      foreignColumns: [proposalsTable.id, proposalsTable.chainId],
    }).onDelete('cascade'),
    primaryKey({ columns: [table.chainId, table.proposalId, table.approver] }),
    index().on(table.proposalId),
    index().on(table.multisigTxId),
    index().on(table.chainId),
  ],
);
export type Approval = typeof approvalsTable.$inferSelect;
