-- CELO price per day from the minute feed and from the daily feed (prices.minute replaces prices.usd).
WITH minutes AS (
  SELECT date_trunc('day', timestamp) AS day, AVG(price) AS avg_minute_price, MIN(price) AS min_price, MAX(price) AS max_price
  FROM prices.minute
  WHERE blockchain = 'celo' AND contract_address = 0x471ece3750da237f93b8e339c536989b8978a438
    AND timestamp >= TIMESTAMP '2026-04-09 00:00:00' AND timestamp < TIMESTAMP '2026-10-06 00:00:00'
  GROUP BY 1
), days AS (
  SELECT timestamp AS day, price AS day_price
  FROM prices.day
  WHERE blockchain = 'celo' AND contract_address = 0x471ece3750da237f93b8e339c536989b8978a438
    AND timestamp >= TIMESTAMP '2026-04-09 00:00:00' AND timestamp < TIMESTAMP '2026-10-06 00:00:00'
), eth AS (
  SELECT timestamp AS day, price AS eth_day_price
  FROM prices.day
  WHERE blockchain = 'ethereum' AND contract_address = 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
    AND timestamp >= TIMESTAMP '2026-04-09 00:00:00' AND timestamp < TIMESTAMP '2026-10-06 00:00:00'
)
SELECT day, avg_minute_price, min_price, max_price, day_price, eth_day_price
FROM days LEFT JOIN minutes USING (day) LEFT JOIN eth USING (day)
ORDER BY day
