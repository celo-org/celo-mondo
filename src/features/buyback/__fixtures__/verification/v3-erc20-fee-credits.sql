-- Fee-currency fees as the token contracts credit them to the fee sinks (mint events), not as gas fields.
SELECT date_trunc('day', evt_block_time) AS day,
  contract_address AS token,
  "to" AS sink,
  COUNT(*) AS credits,
  SUM(CAST(value AS double)) AS raw_value
FROM erc20_celo.evt_Transfer
WHERE evt_block_time >= TIMESTAMP '2026-04-09 00:00:00'
  AND evt_block_time < TIMESTAMP '2026-10-06 00:00:00'
  AND "from" = 0x0000000000000000000000000000000000000000
  AND "to" IN (0xcD437749E43A154C07F3553504c68fBfD56B8778, 0x4200000000000000000000000000000000000011)
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3
