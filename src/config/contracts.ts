import { registryABI } from '@celo/abis';
import { config } from 'src/config/config';
import { ZERO_ADDRESS } from 'src/config/consts';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { celo } from 'viem/chains';

const UNKNOWN_TESTNET_ADDRESSES = {
  Accounts: ZERO_ADDRESS,
  Election: ZERO_ADDRESS,
  EpochManager: ZERO_ADDRESS,
  Governance: ZERO_ADDRESS,
  LockedGold: ZERO_ADDRESS,
  Validators: ZERO_ADDRESS,
} as const;
const MAINNET_ADDRESSES = {
  Accounts: '0x7d21685C17607338b313a7174bAb6620baD0aaB7',
  Election: '0x8D6677192144292870907E3Fa8A5527fE55A7ff6',
  EpochManager: '0xF424B5e85B290b66aC20f8A9EAB75E25a526725E',
  Governance: '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972',
  LockedGold: '0x6cC083Aed9e3ebe302A6336dBC7c921C9f03349E',
  Validators: '0xaEb865bCa93DdC8F47b8e29F40C5399cE34d0C58',
} as const;

export const Addresses =
  config.chain.rpcUrls.default.http[0] === celo.rpcUrls.default.http[0]
    ? MAINNET_ADDRESSES
    : UNKNOWN_TESTNET_ADDRESSES;

export const REGISTRY_ADDRESS = '0x000000000000000000000000000000000000ce10';

export const resolveAddress = async (name: keyof typeof Addresses) => {
  if (Addresses[name] === ZERO_ADDRESS) {
    logger.info(`Resolving ${name} address from registry`);

    return await celoPublicClient.readContract({
      address: REGISTRY_ADDRESS,
      functionName: 'getAddressForStringOrDie',
      abi: registryABI,
      args: [name],
    });
  }

  return Addresses[name];
};
