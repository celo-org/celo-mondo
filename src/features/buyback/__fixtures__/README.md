# Buyback dashboard fixtures

Real data used by `computeStats.realData.test.ts` to pin the dashboard math to
the sequencer-fee tooling in celo-monorepo (`scripts/sequencer-fees`) and to
on-chain state.

| File                    | Contents                                                                                                                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duneFeeRows.json`      | Rows of Dune query `6898547` from its 2026-09-17 execution: the first three L2 days plus every day from 2026-03-25 to 2026-09-17 (two weeks before the CGP-287 cutoff through the latest day).                                                                                          |
| `reportPyExpected.json` | What `report.py`'s `compute_row` (commit `26a608ce4`, carbon fraction 0) returns for each of those rows, plus its sums over the 2026-04-09 to 2026-09-17 window.                                                                                                                        |
| `onchainWindow.json`    | Archive-node reads for the same window: fee-sink balances at the boundary blocks, `SequencerFeeVault` `Withdrawal` events, FeeHandler to Operations Safe and FeeHandler to Carbon Fund transfers, the block where the carbon fraction became zero, and the CGP-287 settlement transfer. |

To regenerate, download the query results with the Dune API (pages of 100
rows), run `compute_row` from the monorepo script over them, and read the
on-chain values with `cast` against an archive node (`cast balance --block`,
`cast call ... balanceOf --block`, `cast logs` in 1M-block chunks).
