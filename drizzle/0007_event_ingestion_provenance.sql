ALTER TABLE "events" ADD COLUMN "ingestedAt" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ingestedVia" jsonb;