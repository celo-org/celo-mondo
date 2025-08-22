-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "chains" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blocksProcessed" (
	"chainId" integer NOT NULL,
	"eventName" text NOT NULL,
	"blockNumber" bigint NOT NULL,
	CONSTRAINT "blocksProcessed_eventName_chainId_pk" PRIMARY KEY("chainId","eventName")
);
--> statement-breakpoint
ALTER TABLE "blocksProcessed" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"eventName" text NOT NULL,
	"args" jsonb NOT NULL,
	"address" varchar(42) NOT NULL,
	"topics" text[] NOT NULL,
	"data" text NOT NULL,
	"blockNumber" bigint NOT NULL,
	"transactionHash" varchar(66) NOT NULL,
	"chainId" integer NOT NULL,
	CONSTRAINT "events_eventName_transactionHash_chainId_pk" PRIMARY KEY("eventName","transactionHash","chainId")
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocksProcessed" ADD CONSTRAINT "blocksProcessed_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_blockNumber_index" ON "events" USING btree ("blockNumber" int8_ops);--> statement-breakpoint
CREATE INDEX "events_chainId_index" ON "events" USING btree ("chainId" int4_ops);--> statement-breakpoint
CREATE INDEX "events_eventName_index" ON "events" USING btree ("eventName" text_ops);--> statement-breakpoint
CREATE INDEX "events_topics_proposalId_index" ON "events" USING gin ((topics[2]) text_ops);
*/