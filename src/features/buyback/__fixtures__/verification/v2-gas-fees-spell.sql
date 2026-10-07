-- Dune's own curated per-transaction fee computation for Celo.
SELECT block_date AS day,
  tx_fee_currency AS currency,
  currency_symbol,
  COUNT(*) AS txs,
  SUM(tx_fee) AS fee_tokens,
  SUM(tx_fee_usd) AS fee_usd
FROM gas.fees
WHERE blockchain = 'celo'
  AND block_month BETWEEN DATE '2026-04-01' AND DATE '2026-10-01'
  AND block_date BETWEEN DATE '2026-04-09' AND DATE '2026-10-05'
GROUP BY 1, 2, 3
ORDER BY 1, 2
