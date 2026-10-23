import { Address, Hex, hashMessage, keccak256, parseSignature, recoverAddress } from 'viem';

export interface VoteSignerFormValues {
  signer: string;
  signature: string;
}

export interface ProofOfPossessionFormValues {
  account: string;
}

// The Accounts contract authorizes a signer by recovering it from an eth_sign style
// signature over keccak256(abi.encodePacked(account)). Signing the raw 32-byte hash
// makes the wallet add the "\x19Ethereum Signed Message:\n32" prefix the contract expects.
export function getProofOfPossessionMessage(account: Address) {
  return { raw: keccak256(account) } as const;
}

// Splits a proof of possession into the (v, r, s) tuple authorizeVoteSigner takes.
// Some wallets encode the recovery byte as 0/1 instead of 27/28, so derive v from yParity.
export function parseProofOfPossession(signature: Hex) {
  const { r, s, yParity } = parseSignature(signature);
  return { r, s, v: 27 + yParity };
}

export function recoverProofOfPossessionSigner(account: Address, signature: Hex) {
  return recoverAddress({ hash: hashMessage(getProofOfPossessionMessage(account)), signature });
}
