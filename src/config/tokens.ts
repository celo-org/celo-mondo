import { ChainId } from 'src/config/chains';
import { Color } from 'src/styles/Color';
import { eqAddress } from 'src/utils/addresses';

export interface Token {
  id: string;
  symbol: string; // The same as id for now
  name: string;
  color: string;
  decimals: number;
}

export interface TokenWithAddress {
  address: Address;
}

export enum TokenId {
  CELO = 'CELO',
  cUSD = 'cUSD',
  cEUR = 'cEUR',
  cREAL = 'cREAL',
}

export const NativeStableTokenIds = [TokenId.cUSD, TokenId.cEUR, TokenId.cREAL];

export const CELO: Token = Object.freeze({
  id: TokenId.CELO,
  symbol: TokenId.CELO,
  name: 'Celo Native',
  color: Color.OldGold,
  decimals: 18,
});
export const cUSD: Token = Object.freeze({
  id: TokenId.cUSD,
  symbol: TokenId.cUSD,
  name: 'Celo Dollar',
  color: Color.OldGreen,
  decimals: 18,
});
export const cEUR: Token = Object.freeze({
  id: TokenId.cEUR,
  symbol: TokenId.cEUR,
  name: 'Celo Euro',
  color: Color.OldGreen,
  decimals: 18,
});
export const cREAL: Token = Object.freeze({
  id: TokenId.cREAL,
  symbol: TokenId.cREAL,
  name: 'Celo Real',
  color: Color.OldGreen,
  decimals: 18,
});

export const Tokens: Record<TokenId, Token> = {
  CELO,
  cUSD,
  cEUR,
  cREAL,
};

export const TokenAddresses: Record<number, Record<TokenId, Address>> = Object.freeze({
  [ChainId.Celo]: {
    [TokenId.CELO]: '0x471EcE3750Da237f93B8E339c536989b8978a438',
    [TokenId.cUSD]: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    [TokenId.cEUR]: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
    [TokenId.cREAL]: '0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787',
  } as Record<TokenId, Address>,
});

export function isNativeToken(tokenId: string) {
  return Object.keys(Tokens).includes(tokenId);
}

export function isNativeStableToken(tokenId: string) {
  return NativeStableTokenIds.includes(tokenId as TokenId);
}

export function getTokenById(id: string): Token | null {
  return Tokens[id as TokenId] || null;
}

export function getTokenAddress(id: TokenId, chainId: number): Address {
  const addr = TokenAddresses[chainId][id];
  if (!addr) throw new Error(`No address found for token ${id} on chain ${chainId}`);
  return addr;
}

export function getTokenByAddress(address: Address): Token {
  const idAddressTuples = Object.values(TokenAddresses)
    .map((idToAddress) => Object.entries(idToAddress))
    .flat();
  // This assumes no clashes btwn different tokens on diff chains
  for (const [id, tokenAddr] of idAddressTuples) {
    if (eqAddress(address, tokenAddr)) {
      return Tokens[id as TokenId];
    }
  }
  throw new Error(`No token found for address ${address}`);
}
