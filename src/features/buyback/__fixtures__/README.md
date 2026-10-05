# Buyback dashboard fixtures

Real data used by `computeStats.realData.test.ts` to pin the dashboard math to
the sequencer-fee tooling in celo-monorepo (`scripts/sequencer-fees`) and to
on-chain state.

| File                         | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duneFeeRows.json`           | Rows of Dune query `6898547` from its execution of 2026-09-17 16:29 UTC: the first three L2 days plus every day from 2026-03-25 to 2026-09-17. The last row is the day the query ran on, so it is a partial (but priced) bucket.                                                                                                                                                                                                                              |
| `duneEigenDaFanOutRows.json` | The three rows the same execution returns for 2025-09-10. The query joins one row per EigenDA payment onto the day's revenue, so that day comes back once per payment. Kept apart from `duneFeeRows.json` because the golden values are keyed by day.                                                                                                                                                                                                         |
| `reportPyExpected.json`      | What `report.py`'s `compute_row` (commit `26a608ce4`, carbon fraction 0) returns for each of those rows, plus its sums over the complete days 2026-04-09 to 2026-09-16.                                                                                                                                                                                                                                                                                       |
| `onchainWindow.json`         | Archive-node reads for those same complete days (block of 2026-04-09 00:00 UTC to block of 2026-09-17 00:00 UTC): fee-sink balances at the boundary blocks, `SequencerFeeVault` `Withdrawal` events, FeeHandler to Operations Safe and FeeHandler to Carbon Fund transfers, fee stablecoins stranded in the vault, the block where the carbon fraction became zero (CGP-236), and the transfer that returned earlier revenue to the Community Fund (CGP-234). |

To regenerate, download the query results with the Dune API (pages of 100
rows), run `compute_row` from the monorepo script over them, and read the
on-chain values with `cast` against an archive node (`cast balance --block`,
`cast call ... balanceOf --block`, `cast logs` in 1M-block chunks). Keep the
on-chain boundary blocks aligned with complete UTC days in the Dune rows, or the
two sides will not reconcile.
