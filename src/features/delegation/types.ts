import { SocialLinksSchema } from 'src/config/types';
import { Hex } from 'viem';
import { celo } from 'viem/chains';
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

export interface RegisterDelegateFormValues {
  name: string;
  address: Address;
  websiteUrl?: string;
  twitterUrl?: string;
  interests: string;
  description: string;
  verificationUrl: string;
  image: File | null;
}

export interface RegisterDelegateRequest extends RegisterDelegateFormValues {
  image: File | null;
  signature?: Hex;
}

export const DelegateeMetadataSchema = z.object({
  name: z.string().min(1),
  address: z.string().length(42).startsWith('0x'),
  logoUri: z.string().min(1),
  date: z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Invalid date format, use YYYY-MM-DD',
  }),
  links: SocialLinksSchema,
  interests: z.array(z.string().min(1)).min(1).max(5),
  description: z.string().min(1).max(1500),
});

export const RegisterDelegateFormValuesSchema = DelegateeMetadataSchema.omit({
  logoUri: true,
  date: true,
}).extend({
  verificationUrl: z.string().min(1).url(),
});

export const DelegateeMetadataMapSchema = z.record(z.string(), DelegateeMetadataSchema);

export type DelegateeMetadata = z.infer<typeof DelegateeMetadataSchema>;

export type Delegatee = DelegateeMetadata & {
  address: Address;
  lockedBalance: bigint;
  votingPower: bigint;
  delegatedBalance: bigint;
};

export const EIP712Delegatee = {
  types: {
    Delegatee: [
      { name: 'address', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'verificationUrl', type: 'string' },
      { name: 'websiteUrl', type: 'string' },
      { name: 'twitterUrl', type: 'string' },
      { name: 'interests', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'imageSha', type: 'string' },
    ],
  },
  primaryType: 'Delegatee',
} as const;

export const EIP712Domain = {
  name: 'Celo Delegatee',
  version: '1',
  chainId: celo.id,
} as const;

export enum RegisterDelegateResponseStatus {
  Success = 'success',
  Error = 'error',
}

export type RegisterDelegateSuccessResponse = {
  status: RegisterDelegateResponseStatus.Success;
  pullRequestUrl: string;
};

export type RegisterDelegateErrorResponse = {
  status: RegisterDelegateResponseStatus.Error;
  message: string;
  errors?: Record<string, string>;
};

export type RegisterDelegateResponse =
  | RegisterDelegateSuccessResponse
  | RegisterDelegateErrorResponse;
