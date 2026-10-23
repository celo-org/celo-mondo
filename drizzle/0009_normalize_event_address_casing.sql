-- Event rows arrive from three ingestion paths that disagree on address casing:
-- MultiBaas delivers checksummed addresses while Alchemy and the cron backfill
-- deliver lowercase ones. The primary key does not cover the address, so
-- whichever writer inserted a row first decided its casing. Readers compared
-- against a lowercase address, which silently hid every checksummed row --
-- multisig Confirmation events among them, leaving governance approval counts
-- short of what the chain actually recorded. Normalize the stored form.
UPDATE "events" SET "address" = lower("address") WHERE "address" <> lower("address");
