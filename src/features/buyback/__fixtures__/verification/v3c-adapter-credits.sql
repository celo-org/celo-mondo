-- USDT and USDC fees reach the sinks through the fee-currency adapters, as plain transfers; by sender per day.
SELECT date_trunc('day', evt_block_time) AS day,
  contract_address AS token,
  "from" AS sender,
  "to" AS sink,
  COUNT(*) AS transfers,
  SUM(CAST(value AS double)) AS raw_value
FROM erc20_celo.evt_Transfer
WHERE evt_block_time >= TIMESTAMP '2026-04-09 00:00:00'
  AND evt_block_time < TIMESTAMP '2026-10-06 00:00:00'
  AND contract_address IN (0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e, 0xcebA9300f2b948710d2653dD7B07f33A8B32118C)
  AND "to" IN (0xcD437749E43A154C07F3553504c68fBfD56B8778, 0x4200000000000000000000000000000000000011)
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3
