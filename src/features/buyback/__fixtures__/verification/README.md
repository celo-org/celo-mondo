# Independent verification queries

DuneSQL written from scratch against raw tables, used on 2026-10-07 to check
the figures the dashboard serves against sources other than query 6898547
and its sub-queries. Each file is self-contained; run it on dune.com (the
window is fixed to 2026-04-09 … 2026-10-05, the dashboard's complete days at
the time) and compare with the rows of the execution the dashboard was
computed from and with `/api/buyback`.

| File                         | What it checks                                                                                                                          | Result on 2026-10-07                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `v1-revenue-by-currency.sql` | Fees per day and fee currency as `gas_used × gas_price` from `celo.transactions`, using the `fee_currency` column and no adapter table. | CELO, USDT, USDC, USDm, EURm identical to the source rows on all 180 days (0.000%). Window: 5,177,863.26 CELO, 284,726.49 USDT.        |
| `v2-gas-fees-spell.sql`      | Dune's curated `gas.fees` computation per transaction.                                                                                  | USDT per day identical. The spell reports no fee or price for Celo's native currency (zero address), so it cannot check the CELO part. |
| `v3-erc20-fee-credits.sql`   | Fee-currency fees as the token contracts credit them to the FeeHandler and the SequencerFeeVault (mints), not as gas fields.            | USDm and EURm identical per day. USDT and USDC do not mint (they go through adapters): see `v3c`.                                      |
| `v3c-adapter-credits.sql`    | USDT and USDC reaching the two sinks as plain transfers.                                                                                | Window +0.004% (USDT) and +0.26% (USDC) above the gas-field sums: the sinks also receive the odd direct transfer. Nothing missing.     |
| `v4-l1-costs.sql`            | L1 costs from `gas.fees` on Ethereum, the batcher found by the batch-inbox recipient rather than the sender; blob fees included.        | Batcher, proposer and challenger identical per day. No blob fees (Celo is alt-DA). Every batcher transaction goes to the inbox.        |
| `v5-celo-price.sql`          | CELO price per day from `prices.day` and the `prices.minute` average; ETH price per day.                                                | Identical to the price implied by the source rows and to the ETH price they carry.                                                     |
| `v6-settled-transfers.sql`   | CELO transferred from the Operations Safe to the Governance contract, from the token's events.                                          | 4 transfers, 2,787,241.73 CELO, last 2026-08-25, the same transactions the archive-node scan in `settledTransfers.ts` finds.           |
| `v7-eigenda-deposits.sql`    | EigenDA on-demand payments as the ETH value sent to the PaymentVault for Celo's account, not as the event amounts.                      | Identical per day.                                                                                                                     |
| `v8-proposer-senders.sql`    | Who sends output proposals to Celo's DisputeGameFactory.                                                                                | 0x79d14553… sends them (8,691 transactions in the window); the two other senders made 3 negligible transactions.                       |

Rebuilt from these inputs (my per-currency amounts × `prices.day` for CELO,
the USD pegs for the stablecoins): fees collected 678,037.25 USD over the
window, identical to the dashboard per day; L1 costs 9,205.18 USD (the
spell's own USD plus EigenDA at `prices.day`) against the dashboard's
9,205.04. The dashboard's remaining difference from Dune's own USD columns
(−0.022% on fees) is the documented choice of valuing stablecoins at their
peg rather than at Dune's price feed.

Addresses were confirmed outside Dune as well: the Superchain registry
(batch inbox `0xff00…42220`, batcher `0x0cd08c7f…`, chain id 42220, alt-DA),
`SystemConfig.batcherHash()` on Ethereum, and the `proposer()` and
`challenger()` of the permissioned dispute game (`0x1204884e…`,
`0x6b145ebf…`).

## Batches to the Community Fund since the cutoff (checked 2026-10-16)

The operator's distribution sheet lists eight transfers. Three of them moved
CELO as plain value in the Safe transaction (no Transfer event), which the
first version of the reader missed; it now traces every Safe execution.

| Period (sheet)     | Transaction   | Path  | CELO         |
| ------------------ | ------------- | ----- | ------------ |
| 2025-03-26 – 04-08 | `0xfbe1dac0…` | token | 1,748,950.00 |
| 2026-04-09 – 06-17 | `0xf55ab095…` | value | 2,566,770.00 |
| 2026-06-19 – 07-15 | `0x0c9ed148…` | token | 1,324,344.00 |
| 2026-07-15 – 07-31 | `0x8b2206b7…` | token | 795,081.00   |
| 2026-08-01 – 08-15 | `0x0403c49f…` | token | 667,815.00   |
| 2026-08-16 – 08-31 | `0x1ab9a22b…` | value | 723,708.00   |
| 2026-09-01 – 09-15 | `0x7badf29e…` | value | 673,236.00   |
| 2026-09-16 – 09-30 | `0x92ebdf72…` | token | 648,972.00   |

Since the cutoff: 7,399,927.73 CELO in 8 transfers (the eighth is 1.73 CELO
of dust sent through the token contract), last on 2026-10-08. The sheet's
per-period P&L (fees in CELO, stablecoins at CELO equivalent, L1 costs, OP
share, net) matches the dashboard's per-day figures within 0.1–0.5% on every
period once its date headers are read as inclusive ranges (`Jun 19 – Jul 15`,
`Jul 15 – Jul 31`, `Sep 16 – Sep 30`); the net of each period equals the
amount transferred.
