CREATE TYPE "public"."voteType" AS ENUM('abstain', 'no', 'none', 'yes');--> statement-breakpoint
CREATE TABLE "blocksProcessed" (
	"chainId" integer NOT NULL,
	"eventName" text NOT NULL,
	"blockNumber" numeric NOT NULL,
	CONSTRAINT "blocksProcessed_eventName_chainId_pk" PRIMARY KEY("eventName","chainId")
);
--> statement-breakpoint
CREATE TABLE "chains" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"chainId" integer NOT NULL,
	"eventName" text NOT NULL,
	"args" jsonb NOT NULL,
	"address" varchar(42) NOT NULL,
	"topics" text[] NOT NULL,
	"data" text NOT NULL,
	"blockNumber" numeric NOT NULL,
	"transactionHash" varchar(66) NOT NULL,
	CONSTRAINT "events_eventName_transactionHash_chainId_pk" PRIMARY KEY("eventName","transactionHash","chainId")
);
--> statement-breakpoint
CREATE TABLE "proposals" (
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
CREATE TABLE "votes" (
	"chainId" integer NOT NULL,
	"type" "voteType" NOT NULL,
	"count" numeric NOT NULL,
	"proposalId" bigint NOT NULL,
	CONSTRAINT "votes_chainId_type_proposalId_pk" PRIMARY KEY("chainId","type","proposalId")
);
--> statement-breakpoint
ALTER TABLE "blocksProcessed" ADD CONSTRAINT "blocksProcessed_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_pastId_chainId_proposals_id_chainId_fk" FOREIGN KEY ("pastId","chainId") REFERENCES "public"."proposals"("id","chainId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_proposalId_chainId_proposals_id_chainId_fk" FOREIGN KEY ("proposalId","chainId") REFERENCES "public"."proposals"("id","chainId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_blockNumber_index" ON "events" USING btree ("blockNumber");--> statement-breakpoint
CREATE INDEX "events_eventName_index" ON "events" USING btree ("eventName");--> statement-breakpoint
CREATE INDEX "events_chainId_index" ON "events" USING btree ("chainId");--> statement-breakpoint
-- CREATE INDEX "events_topics_proposalId_index" ON "events" USING gin ("topics"[2]);