ALTER TABLE "proposals" ALTER COLUMN "executedAt" SET DATA TYPE timestamp WITHOUT TIME ZONE USING to_timestamp("executedAt");--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "queuedAt" timestamp;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "queuedAtBlockNumber" numeric;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "dequeuedAt" timestamp;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "dequeuedAtBlockNumber" numeric;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "approvedAt" timestamp;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "approvedAtBlockNumber" numeric;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "executedAtBlockNumber" numeric;--> statement-breakpoint