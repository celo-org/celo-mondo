import { logger } from 'src/utils/logger';
import { getAddress, isAddress } from 'viem';

export function isValidAddress(address: string) {
  // Need to catch because ethers' isAddress throws in some cases (bad checksum)
  try {
    const isValid = address && isAddress(address);
    return !!isValid;
  } catch (error) {
    logger.warn('Invalid address', error, address);
    return false;
  }
}

export function validateAddress(address: string, context: string) {
  if (!address || !isAddress(address)) {
    const errorMsg = `Invalid addresses for ${context}: ${address}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }
}

export function normalizeAddress(address: string) {
  return getAddress(address);
}

export function shortenAddress(address: string, capitalize = true) {
  validateAddress(address, 'shorten');
  const normalizedAddress = normalizeAddress(address);

  const start = normalizedAddress.substring(0, 6);
  const end = normalizedAddress.substring(address.length - 4);

  const shortened = `${start}...${end}`;
  return capitalize ? capitalizeAddress(shortened) : shortened;
}

export function capitalizeAddress(address: string) {
  return '0x' + address.substring(2).toUpperCase();
}

export function areAddressesEqual(a1: string, a2: string) {
  return normalizeAddress(a1) === normalizeAddress(a2);
}

export function ensure0x(hexstr: string) {
  return hexstr.startsWith('0x') ? hexstr : `0x${hexstr}`;
}

export function strip0x(hexstr: string) {
  return hexstr.startsWith('0x') ? hexstr.slice(2) : hexstr;
}
