CREATE TABLE "buyback_stats" (
	"executionId" text PRIMARY KEY NOT NULL,
	"executedAt" timestamp with time zone NOT NULL,
	"stats" jsonb NOT NULL,
	"computedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "buyback_stats_executedAt_index" ON "buyback_stats" USING btree ("executedAt" DESC NULLS LAST);