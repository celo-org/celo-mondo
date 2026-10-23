-- Who actually sends the output proposals and challenges to Celo's DisputeGameFactory on L1.
SELECT tx_from, COUNT(*) AS txs, SUM(tx_fee) AS fee_eth
FROM gas.fees
WHERE blockchain = 'ethereum'
  AND block_month BETWEEN DATE '2026-04-01' AND DATE '2026-10-01'
  AND block_date BETWEEN DATE '2026-04-09' AND DATE '2026-10-05'
  AND tx_to = 0xfbac162162f4009bb007c6debc36b1dac10af683
GROUP BY 1
ORDER BY 2 DESC
LIMIT 10
