CREATE TABLE "analyticsEvents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"eventName" text NOT NULL,
	"properties" jsonb DEFAULT '{}' NOT NULL,
	"sessionId" uuid
);
--> statement-breakpoint
CREATE INDEX "idx_analytics_events_name_properties" ON "analyticsEvents" USING gin ("properties");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_name" ON "analyticsEvents" USING btree ("eventName");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_created_at" ON "analyticsEvents" USING btree ("createdAt" DESC NULLS LAST);
