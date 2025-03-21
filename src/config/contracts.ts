import { registryABI } from '@celo/abis-12';
import { config } from 'src/config/config';
import { ZERO_ADDRESS } from 'src/config/consts';
import { createCeloPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { celo, celoAlfajores } from 'viem/chains';

const UNKNOWN_TESTNET_ADDRESSES = {
  Accounts: ZERO_ADDRESS,
  Election: ZERO_ADDRESS,
  EpochManager: ZERO_ADDRESS,
  Governance: ZERO_ADDRESS,
  LockedGold: ZERO_ADDRESS,
  Validators: ZERO_ADDRESS,
} as const;

const ALFAJORES_ADDRESSES = {
  Accounts: '0xed7f51A34B4e71fbE69B3091FcF879cD14bD73A9',
  Election: '0x1c3eDf937CFc2F6F51784D20DEB1af1F9a8655fA',
  EpochManager: '0x106d8A1192fB0E58079487d093b42332e66F5d8f',
  Governance: '0xAA963FC97281d9632d96700aB62A4D1340F9a28a',
  LockedGold: '0x6a4CC5693DC5BFA3799C699F3B941bA2Cb00c341',
  Validators: '0x9acF2A99914E083aD0d610672E93d14b0736BBCc',
} as const;

const MAINNET_ADDRESSES = {
  Accounts: '0x7d21685C17607338b313a7174bAb6620baD0aaB7',
  Election: '0x8D6677192144292870907E3Fa8A5527fE55A7ff6',
  // TODO once the migration is done add the address here
  // for now it will be resolved automatically during runtime
  EpochManager: ZERO_ADDRESS,
  Governance: '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972',
  LockedGold: '0x6cC083Aed9e3ebe302A6336dBC7c921C9f03349E',
  Validators: '0xaEb865bCa93DdC8F47b8e29F40C5399cE34d0C58',
} as const;

export const Addresses =
  config.chain.rpcUrls.default.http[0] === celo.rpcUrls.default.http[0]
    ? MAINNET_ADDRESSES
    : config.chain.rpcUrls.default.http[0] === celoAlfajores.rpcUrls.default.http[0]
      ? ALFAJORES_ADDRESSES
      : UNKNOWN_TESTNET_ADDRESSES;

export const REGISTRY_ADDRESS = '0x000000000000000000000000000000000000ce10';

export const resolveAddress = async (name: keyof typeof Addresses) => {
  if (Addresses[name] === ZERO_ADDRESS) {
    logger.info(`Resolving ${name} address from registry`);

    const client = createCeloPublicClient();

    return await client.readContract({
      address: REGISTRY_ADDRESS,
      functionName: 'getAddressForStringOrDie',
      abi: registryABI,
      args: [name],
    });
  }

  return Addresses[name];
};
