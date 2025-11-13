# Celo Mondo

Celo Mondo is a [DApp](https://en.wikipedia.org/wiki/Decentralized_application) for participating in staking and governance on [Celo](https://celo.org).

Earn rewards by locking & staking your CELO tokens. Help decide Celo's destiny by casting your vote in on-chain governance proposals.

## Staking & Governance

For information about how Celo's Proof-of-Stake protocol works, or other aspects of the Celo blockchain, see the official [Celo Documentation](https://docs.celo.org/protocol/pos)

## Support

For support, you can [file an issue](https://github.com/celo-org/celo-mondo/issues/new) on this repository or join the [Celo Discord](https://discord.gg/celo)

## Development

### Getting Started (for cLabs Vercel Team Members)

1. Clone the repository
2. Install dependencies: `yarn`
3. Setup environment: `yarn setup:env`
   - This will log you into Vercel, link the project, and pull environment variables
   - The environment includes connection to the staging database (no local DB setup needed)
4. Run locally: `yarn dev`
5. Test locally: `yarn test`

### Getting Started (for Contributors / Local Database Development)

If you're not part of the cLabs Vercel team or want to modify the database locally:

1. Clone the repository
2. Install dependencies: `yarn`
3. Start a local PostgreSQL database:
   ```bash
   docker run -d \
     --name celo-mondo-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=postgres \
     -p 5432:5432 \
     postgres:16
   ```
4. Restore the database from the dump file:
   ```bash
   cat ./db_dump.sql | docker exec -i celo-mondo-postgres psql -U postgres
   ```
5. Create a `.env` file with your local database connection:
   ```bash
   POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/postgres"
   NEXT_PUBLIC_RPC_URL="https://forno.celo.org"
   ```
6. Backfill the database with historical governance events:
   ```bash
   yarn backfill-db
   ```
7. Update proposal stages to current state:
   ```bash
   yarn update-proposal-stages
   ```
8. Run locally: `yarn dev`
9. Test locally: `yarn test`

### Running Against Different Networks

To run Celo Mondo against a different network, set the `NEXT_PUBLIC_RPC_URL` env variable to your desired RPC endpoint (e.g., `http://<your-rpc-url>`).

For more information about the architecture and internals of this app, see [DEVELOPER.md](./DEVELOPER.md).

### Governance Architecture

This section is a short explanation for the governance fetching and displaying. For some context, celo-mondo didn't have a backend part for a long time and fully relied on three data sources: celo blockchain, blockscout events API, and the github repository celo-org/governance. This meant that all merging and data fetching had to happen at runtime in the front-end, per client.
Now, since the introduction of the backend we set-up a flow to make the front-end a bit simpler.

Events are indexed in the `events` table (for redundancy, data is fetched from both [webhooks](https://t3bb35o5zzb6zpgwizsfvu6r2a.multibaas.com/webhooks/2) and a [github action cronjob](./.github/workflows/cronjob.yml) just in case).
When a new events is received, we can decode it and update the `proposals` table according the event to have an always up to date table that the each front-end client can fetch without further data manipulation. See `src/app/api/webhooks/multibaas/route.ts` to see the webhook and the function calls.
There's a small schema explaining each table in more details here: [<img src="./readme-schema.svg" alt="celo-mondo excalidraw">](https://excalidraw.com/#json=cKbblqlCm0IvTZaW1u232,ZQcreoxqt3tt1jShIbwgIw)

### Helper scripts

Scripts are located in the `src/scripts` folder and can be ran through `tsx` or via the package.json's scripts.

#### `cacheProposalTxSelectors.ts`

This script reads the `@celo/abis` and other hand-added known celo abis (eg: some mento stuff), and generates the function 4-byte hash and saves it in `src/app/config/selectors.json`

#### `fetchHistoricalGovernanceEvents.ts`

This script goes through ALL blocks (starting from last saved block in the DB, or 0 if filling a new DB) and gathers all governance-related events to the DB as well as compute proposal and vote states at the end

#### `updateProposalTable.ts`

This script computes proposal state from the store events. It will **OVERWRITE** proposals' table data from the events.
It can take an optional argument proposalIds eg: `123,457,789`. To replay events from only the given specific proposals.

#### `updateVotesTable.ts`

This script computes all proposals votes from the store events. It will **OVERWRITE** votes' table data from the events. It can take an optional argument proposalIds eg: `123,457,789`. To replay events from only the given specific proposals.
