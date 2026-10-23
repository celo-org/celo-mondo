DROP INDEX "buyback_stats_executedAt_index";--> statement-breakpoint
ALTER TABLE "buyback_stats" ADD COLUMN "startedAt" timestamp with time zone;--> statement-breakpoint
UPDATE "buyback_stats" SET "startedAt" = "executedAt";--> statement-breakpoint
ALTER TABLE "buyback_stats" ALTER COLUMN "startedAt" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "buyback_stats_startedAt_index" ON "buyback_stats" USING btree ("startedAt" DESC NULLS LAST);
