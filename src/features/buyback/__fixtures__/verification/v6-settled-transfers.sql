-- CELO from the Operations Safe to the Governance contract since the cutoff.
SELECT evt_block_time, evt_block_number, evt_tx_hash, CAST(value AS double) / 1e18 AS celo
FROM erc20_celo.evt_Transfer
WHERE contract_address = 0x471ece3750da237f93b8e339c536989b8978a438
  AND "from" = 0x7a1e98fc9a008107dbd1f430a05ace8cf6f3fe19
  AND "to" = 0xd533ca259b330c7a88f74e000a3faea2d63b7972
  AND evt_block_time >= TIMESTAMP '2026-04-09 00:00:00'
ORDER BY evt_block_time
