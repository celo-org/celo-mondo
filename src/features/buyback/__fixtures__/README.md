# Buyback dashboard fixtures

Real data used by `computeStats.realData.test.ts` to pin the dashboard math to
the sequencer-fee tooling in celo-monorepo (`scripts/sequencer-fees`) and to
on-chain state.

| File                         | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duneFeeRows.json`           | Rows of Dune query `6898547` from its execution of 2026-09-17 16:29 UTC: every day from the L2 launch (2025-03-26) to 2026-09-17, one row per day. That execution predates version 6 of the query and returned 2025-09-10 once per EigenDA payment; those copies are merged here into one row with the payments summed, as the query now does. The last row is the day the query ran on, so it is a partial (but priced) bucket.                              |
| `duneEigenDaFanOutRows.json` | The three rows the same execution returned for 2025-09-10. Until version 6 of the query (2026-10-06) it joined one row per EigenDA payment onto the day's revenue, so that day came back once per payment; the rows stay as the regression case for the merge that guards against it. Kept apart from `duneFeeRows.json` because the golden values are keyed by day.                                                                                          |
| `reportPyExpected.json`      | What `report.py`'s `compute_row` (commit `a56c5bfdc`, carbon fraction 0) returns for each of those rows, plus its sums over the complete days 2026-04-09 to 2026-09-16 (`windowTotals`) and over the first period 2025-03-26 to 2026-04-08 (`preCutoffTotals`), which CGP-234 settled.                                                                                                                                                                        |
| `onchainWindow.json`         | Archive-node reads for those same complete days (block of 2026-04-09 00:00 UTC to block of 2026-09-17 00:00 UTC): fee-sink balances at the boundary blocks, `SequencerFeeVault` `Withdrawal` events, FeeHandler to Operations Safe and FeeHandler to Carbon Fund transfers, fee stablecoins stranded in the vault, the block where the carbon fraction became zero (CGP-236), and the transfer that returned earlier revenue to the Community Fund (CGP-234). |

To regenerate, download the query results with the Dune API (pages of 100
rows), run `compute_row` from the monorepo script over them, and read the
on-chain values with `cast` against an archive node (`cast balance --block`,
`cast call ... balanceOf --block`, `cast logs` in 1M-block chunks). Keep the
on-chain boundary blocks aligned with complete UTC days in the Dune rows, or the
two sides will not reconcile.
