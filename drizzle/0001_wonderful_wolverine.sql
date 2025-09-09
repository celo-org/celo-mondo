CREATE TYPE "public"."voteType" AS ENUM('abstain', 'no', 'none', 'yes');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposals" (
	"chainId" integer NOT NULL,
	"id" bigint NOT NULL,
	"pastId" bigint,
	"stage" integer NOT NULL,
	"cgp" bigint NOT NULL,
	"url" text,
	"cgpUrl" text,
	"cgpUrlRaw" text,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"timestamp" integer NOT NULL,
	"executedAt" integer,
	"proposer" text,
	"deposit" numeric,
	"networkWeight" numeric,
	"transactionCount" integer,
	CONSTRAINT "proposals_id_chainId_pk" PRIMARY KEY("id","chainId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "votes" (
	"chainId" integer NOT NULL,
	"type" "voteType" NOT NULL,
	"count" numeric NOT NULL,
	"proposalId" bigint NOT NULL,
	CONSTRAINT "votes_chainId_type_proposalId_pk" PRIMARY KEY("chainId","type","proposalId")
);
--> statement-breakpoint
ALTER TABLE "blocksProcessed" ALTER COLUMN "blockNumber" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "blockNumber" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_pastId_chainId_proposals_id_chainId_fk" FOREIGN KEY ("pastId","chainId") REFERENCES "public"."proposals"("id","chainId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_proposalId_chainId_proposals_id_chainId_fk" FOREIGN KEY ("proposalId","chainId") REFERENCES "public"."proposals"("id","chainId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_blockNumber_index" ON "events" USING btree ("blockNumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_chainId_index" ON "events" USING btree ("chainId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_eventName_index" ON "events" USING btree ("eventName");--> statement-breakpoint
-- DROP INDEX "events_topics_proposalId_index";--> statement-breakpoint
-- CREATE INDEX "events_topics_proposalId_index" ON "events" USING gin ("topics"[2]);--> statement-breakpoint
ALTER TABLE "blocksProcessed" DROP CONSTRAINT "blocksProcessed_eventName_chainId_pk";
--> statement-breakpoint
ALTER TABLE "blocksProcessed" ADD CONSTRAINT "blocksProcessed_eventName_chainId_pk" PRIMARY KEY("eventName","chainId");