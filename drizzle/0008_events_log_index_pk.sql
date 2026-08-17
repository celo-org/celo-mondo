-- Add logIndex to the events PK so multiple same-name events emitted by one
-- transaction (e.g. ProposalVoteRevokedV2 for two proposals in a single tx)
-- can coexist. Pre-existing rows are backfilled with 0; the DEFAULT is dropped
-- immediately so new inserts must always provide the real log index.
ALTER TABLE "events" ADD COLUMN "logIndex" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "logIndex" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_eventName_transactionHash_chainId_pk";--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_eventName_transactionHash_logIndex_chainId_pk" PRIMARY KEY("eventName","transactionHash","logIndex","chainId");
