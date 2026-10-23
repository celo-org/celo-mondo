-- L1 costs from Dune's gas.fees (includes blob fees); batcher found by the batch inbox recipient, not by sender.
SELECT block_date AS day,
  CASE
    WHEN tx_to = 0xff00000000000000000000000000000000042220 THEN 'batcher_by_inbox'
    WHEN tx_from = 0x0cd08c7f7a96aa9635f761b49216b9ea74c5ca60 THEN 'batcher_by_sender_only'
    WHEN tx_from IN (0x1204884e697efd929729b9a717ea14496298a689, 0x79d14553d6b3484f5612272b43c219a882415d33) THEN 'proposer'
    WHEN tx_from = 0x6b145ebf66602ec524b196426b46631259689583 THEN 'challenger'
  END AS service,
  COUNT(*) AS txs,
  SUM(tx_fee) AS fee_eth_total,
  SUM(CAST(gas_used AS double) * CAST(gas_price AS double)) / 1e18 AS exec_fee_eth,
  SUM(tx_fee_usd) AS fee_usd,
  array_join(array_agg(DISTINCT array_join(map_keys(tx_fee_breakdown), '+')), '|') AS breakdown_keys
FROM gas.fees
WHERE blockchain = 'ethereum'
  AND block_month BETWEEN DATE '2026-04-01' AND DATE '2026-10-01'
  AND block_date BETWEEN DATE '2026-04-09' AND DATE '2026-10-05'
  AND (tx_to = 0xff00000000000000000000000000000000042220
    OR tx_from IN (0x0cd08c7f7a96aa9635f761b49216b9ea74c5ca60, 0x1204884e697efd929729b9a717ea14496298a689, 0x79d14553d6b3484f5612272b43c219a882415d33, 0x6b145ebf66602ec524b196426b46631259689583))
GROUP BY 1, 2
ORDER BY 1, 2
