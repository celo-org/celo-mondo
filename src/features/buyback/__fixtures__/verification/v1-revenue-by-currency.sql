-- Independent of query 6898180: fee currency column, no adapter table, raw sums per currency.
SELECT block_date AS day,
  fee_currency,
  COUNT(*) AS txs,
  CAST(SUM(gas_used * gas_price) AS double) / 1e18 AS fee_raw_1e18
FROM celo.transactions
WHERE block_date BETWEEN DATE '2026-04-09' AND DATE '2026-10-05'
GROUP BY 1, 2
ORDER BY 1, 2
