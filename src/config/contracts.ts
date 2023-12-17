import type { Address } from 'viem';

export enum CeloContract {
  Accounts = 'Accounts',
  DoubleSigningSlasher = 'DoubleSigningSlasher',
  DowntimeSlasher = 'DowntimeSlasher',
  Election = 'Election',
  EpochRewards = 'EpochRewards',
  GasPriceMinimum = 'GasPriceMinimum',
  GoldToken = 'GoldToken',
  Governance = 'Governance',
  LockedGold = 'LockedGold',
  Registry = 'Registry',
  Reserve = 'Reserve',
  StableToken = 'StableToken',
  StableTokenBRL = 'StableTokenBRL',
  StableTokenEUR = 'StableTokenEUR',
  Validators = 'Validators',
}

export const Addresses: Record<CeloContract, Address> = {
  [CeloContract.Accounts]: '0x7d21685C17607338b313a7174bAb6620baD0aaB7',
  [CeloContract.DoubleSigningSlasher]: '0x50C100baCDe7E2b546371EB0Be1eACcf0A6772ec',
  [CeloContract.DowntimeSlasher]: '0x71CAc3B31c138F3327C6cA14f9a1c8d752463fDd',
  [CeloContract.Election]: '0x8D6677192144292870907E3Fa8A5527fE55A7ff6',
  [CeloContract.EpochRewards]: '0x07F007d389883622Ef8D4d347b3f78007f28d8b7',
  [CeloContract.GasPriceMinimum]: '0xDfca3a8d7699D8bAfe656823AD60C17cb8270ECC',
  [CeloContract.GoldToken]: '0x471EcE3750Da237f93B8E339c536989b8978a438',
  [CeloContract.Governance]: '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972',
  [CeloContract.LockedGold]: '0x6cC083Aed9e3ebe302A6336dBC7c921C9f03349E',
  [CeloContract.Registry]: '0x000000000000000000000000000000000000ce10',
  [CeloContract.Reserve]: '0x9380fA34Fd9e4Fd14c06305fd7B6199089eD4eb9',
  [CeloContract.StableToken]: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  [CeloContract.StableTokenBRL]: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
  [CeloContract.StableTokenEUR]: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
  [CeloContract.Validators]: '0xaEb865bCa93DdC8F47b8e29F40C5399cE34d0C58',
};
