-- Supabase exposes the public schema through PostgREST with the anon key. Without RLS
-- every table is readable and writable by anyone holding that key. The app connects as
-- the table owner (bypasses RLS), so enabling RLS with no policies only locks out the API.
ALTER TABLE "analyticsEvents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "approvals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "blocksProcessed" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buyback_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY;
