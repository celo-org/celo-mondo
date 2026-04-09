CREATE TABLE "events_alchemy" (
	"chainId" integer NOT NULL,
	"eventName" text NOT NULL,
	"args" jsonb NOT NULL,
	"address" varchar(42) NOT NULL,
	"topics" text[] NOT NULL,
	"data" text NOT NULL,
	"blockNumber" numeric NOT NULL,
	"transactionHash" varchar(66) NOT NULL,
	CONSTRAINT "events_alchemy_eventName_transactionHash_chainId_pk" PRIMARY KEY("eventName","transactionHash","chainId")
);
--> statement-breakpoint
ALTER TABLE "events_alchemy" ADD CONSTRAINT "events_alchemy_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_alchemy_blockNumber_index" ON "events_alchemy" USING btree ("blockNumber");--> statement-breakpoint
CREATE INDEX "events_alchemy_eventName_index" ON "events_alchemy" USING btree ("eventName");--> statement-breakpoint
CREATE INDEX "events_alchemy_chainId_index" ON "events_alchemy" USING btree ("chainId");--> statement-breakpoint
