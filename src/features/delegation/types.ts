import { SocialLinksSchema } from 'src/config/types';
import { z } from 'zod';

// See https://github.com/celo-org/celo-monorepo/blob/release/core-contracts/10/packages/protocol/contracts/governance/LockedGold.sol#L667
export interface DelegationAmount {
  percent: number;
  amount: bigint;
}

export interface DelegationBalances {
  totalPercent: number;
  totalAmount: bigint;
  delegateeToAmount: AddressTo<DelegationAmount>;
}

export enum DelegateActionType {
  Delegate = 'delegate',
  Undelegate = 'undelegate',
  Transfer = 'transfer',
}

export const DelegateActionValues = Object.values(DelegateActionType);

export interface DelegateFormValues {
  action: DelegateActionType;
  percent: number;
  delegatee: Address;
  // Only used in transfer actions, the new target group
  transferDelegatee: Address;
}

export const DelegateeMetadataSchema = z.object({
  name: z.string().min(1),
  address: z.string().length(42).startsWith('0x'),
  logoUri: z.string().min(1),
  date: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Invalid date format, use YYYY-MM-DD',
  }),
  links: SocialLinksSchema,
  interests: z.array(z.string().min(1)),
  description: z.string().min(1).max(1500),
});

export const DelegateeMetadataListSchema = z.array(DelegateeMetadataSchema);

export type DelegateeMetadata = z.infer<typeof DelegateeMetadataSchema>;

export type Delegatee = DelegateeMetadata & {
  address: Address;
  lockedBalance: bigint;
  votingPower: bigint;
  delegatedBalance: bigint;
};
