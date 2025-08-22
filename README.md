# Celo Mondo

Celo Mondo is a [DApp](https://en.wikipedia.org/wiki/Decentralized_application) for participating in staking and governance on [Celo](https://celo.org).

Earn rewards by locking & staking your CELO tokens. Help decide Celo's destiny by casting your vote in on-chain governance proposals.

## Staking & Governance

For information about how Celo's Proof-of-Stake protocol works, or other aspects of the Celo blockchain, see the official [Celo Documentation](https://docs.celo.org/protocol/pos)

## Support

For support, you can [file an issue](https://github.com/celo-org/celo-mondo/issues/new) on this repository or join the [Celo Discord](https://discord.gg/celo)

## Development

To run Celo Mondo against alfajores network set `NEXT_PUBLIC_RPC_URL` env variable to `alfajores`.

To run Celo Mondo against any other network (such as your local testnet) set `NEXT_PUBLIC_RPC_URL` env variable to `http://<your-rpc-url>`.

1. Install: `yarn`
2. Setup: `yarn prepare`
3. Run locally: `yarn dev`
   1. the `/governance` pages are powered by a postgresql database that needs to be setup, there's a docker file for your convenience as well as a (hopefully not too dated) data dump in `./db_dump.sql`
   2. restore with `cat ./db_dump.sql | docker exec -i <your-db-container> psql -U postgres`
   3. make sure your .env has a valid `POSTGRES_URL` variable
4. Test locally: `yarn test`

For more information about the architecture and internals of this app, see [DEVELOPER.md](./DEVELOPER.md).

### Governance Architecture

This section is a short explanation for the governance fetching and displaying. For some context, celo-mondo didn't have a backend part for a long time and fully relied on three data sources: celo blockchain, celoscan events API, and the github repository celo-org/governance. This meant that all merging and data fetching had to happen at runtime in the front-end, per client.
Now, since the introduction of the backend we set-up a flow to make the front-end a bit simpler.

Events are indexed in the `events` table (for redundancy, data is fetched from both [webhooks](https://t3bb35o5zzb6zpgwizsfvu6r2a.multibaas.com/webhooks/2) and a [github action cronjob](./.github/workflows/cronjob.yml) just in case).
When a new events is received, we can decode it and update the `proposals` table according the event to have an always up to date table that the each front-end client can fetch without further data manipulation. See `src/app/api/webhooks/multibaas/route.ts` to see the webhook and the function calls.
There's a small schema explaining each table in more details here: [<img src="./readme-schema.svg" alt="celo-mondo excalidraw">](https://excalidraw.com/#json=cKbblqlCm0IvTZaW1u232,ZQcreoxqt3tt1jShIbwgIw)
