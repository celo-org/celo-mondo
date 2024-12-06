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
4. Test locally: `yarn test`

For more information about the architecture and internals of this app, see [DEVELOPER.md](./DEVELOPER.md).
