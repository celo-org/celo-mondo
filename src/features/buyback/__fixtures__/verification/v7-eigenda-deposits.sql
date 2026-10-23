-- EigenDA on-demand payments as the ETH value sent to the PaymentVault for Celo's account (not the event).
SELECT block_date AS day, COUNT(*) AS deposits, SUM(CAST(value AS double)) / 1e18 AS eth
FROM ethereum.transactions
WHERE block_date BETWEEN DATE '2026-04-09' AND DATE '2026-10-05'
  AND "to" = 0xb2e7ef419a2a399472ae22ef5cfccb8be97a4b05
  AND success
  AND bytearray_position(data, 0x000000000000000000000000ecf08b0a4f196e06e9aece95d5dd724bc121f09c) > 0
GROUP BY 1
ORDER BY 1
