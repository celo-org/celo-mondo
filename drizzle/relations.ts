import { relations } from "drizzle-orm/relations";
import { chains, blocksProcessed, events } from "./schema";

export const blocksProcessedRelations = relations(blocksProcessed, ({one}) => ({
	chain: one(chains, {
		fields: [blocksProcessed.chainId],
		references: [chains.id]
	}),
}));

export const chainsRelations = relations(chains, ({many}) => ({
	blocksProcesseds: many(blocksProcessed),
	events: many(events),
}));

export const eventsRelations = relations(events, ({one}) => ({
	chain: one(chains, {
		fields: [events.chainId],
		references: [chains.id]
	}),
}));