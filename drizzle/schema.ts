import { pgTable, integer, text, foreignKey, primaryKey, bigint, index, jsonb, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const chains = pgTable("chains", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
});

export const blocksProcessed = pgTable("blocksProcessed", {
	chainId: integer().notNull(),
	eventName: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	blockNumber: bigint({ mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chainId],
			foreignColumns: [chains.id],
			name: "blocksProcessed_chainId_chains_id_fk"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.chainId, table.eventName], name: "blocksProcessed_eventName_chainId_pk"}),
]);

export const events = pgTable("events", {
	eventName: text().notNull(),
	args: jsonb().notNull(),
	address: varchar({ length: 42 }).notNull(),
	topics: text().array().notNull(),
	data: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	blockNumber: bigint({ mode: "number" }).notNull(),
	transactionHash: varchar({ length: 66 }).notNull(),
	chainId: integer().notNull(),
}, (table) => [
	index().using("btree", table.blockNumber.asc().nullsLast().op("int8_ops")),
	index().using("btree", table.chainId.asc().nullsLast().op("int4_ops")),
	index().using("btree", table.eventName.asc().nullsLast().op("text_ops")),
	index("events_topics_proposalId_index").using("gin", sql`(topics[2])`),
	foreignKey({
			columns: [table.chainId],
			foreignColumns: [chains.id],
			name: "events_chainId_chains_id_fk"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.eventName, table.transactionHash, table.chainId], name: "events_eventName_transactionHash_chainId_pk"}),
]);
