// Mainnet addresses of the CELOccelerate fee path; the dashboard is mainnet
// only. Fees land in the SequencerFeeVault, the FeeHandler forwards them to
// the Operations Safe (and, until CGP-236, a share to the Carbon Fund), and
// the operator's Safe batches pay the Community Fund, which is the Governance
// contract's balance, in CELO through the CELO token contract.
export const SEQUENCER_FEE_VAULT = '0x4200000000000000000000000000000000000011' as const;
export const FEE_HANDLER = '0xcD437749E43A154C07F3553504c68fBfD56B8778' as const;
export const OPERATIONS_SAFE = '0x7A1E98FC9a008107DbD1f430a05Ace8cf6f3FE19' as const;
export const COMMUNITY_FUND = '0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972' as const;
export const CARBON_FUND = '0xCe10d577295d34782815919843a3a4ef70Dc33ce' as const;
export const CELO_TOKEN = '0x471EcE3750Da237f93B8E339c536989b8978a438' as const;

export const celoscanAddress = (address: string) => `https://celoscan.io/address/${address}`;
