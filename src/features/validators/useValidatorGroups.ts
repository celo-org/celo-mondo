import { accountsABI, electionABI, lockedGoldABI, validatorsABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useToastError } from 'src/components/notifications/useToastError';
import { MAX_NUM_ELECTABLE_VALIDATORS, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses } from 'src/config/contracts';
import { logger } from 'src/utils/logger';
import { bigIntSum } from 'src/utils/math';
import { MulticallReturnType, PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';
import { Validator, ValidatorGroup, ValidatorStatus } from './types';

export function useValidatorGroups() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useValidatorGroups', publicClient],
    queryFn: () => {
      logger.debug('Fetching validator groups');
      return fetchValidatorGroupInfo(publicClient);
    },
    gcTime: Infinity,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  useToastError(error, 'Error fetching validator groups');

  return {
    isLoading,
    isError,
    groups: data?.groups,
    totalLocked: data?.totalLocked,
    totalVotes: data?.totalVotes,
  };
}

async function fetchValidatorGroupInfo(publicClient: PublicClient) {
  const { validatorAddrs, electedSignersSet } = await fetchValidatorAddresses(publicClient);

  const validatorDetails = await fetchValidatorDetails(publicClient, validatorAddrs);
  const validatorNames = await fetchNamesForAccounts(publicClient, validatorAddrs);

  if (
    validatorAddrs.length !== validatorDetails.length ||
    validatorAddrs.length !== validatorNames.length
  ) {
    throw new Error('Validator list / details size mismatch');
  }

  // Process validator lists to create list of validator groups
  const groups: Record<Address, ValidatorGroup> = {};
  for (let i = 0; i < validatorAddrs.length; i++) {
    const valAddr = validatorAddrs[i];
    const valDetails = validatorDetails[i];
    const valName = validatorNames[i] || '';
    const groupAddr = valDetails.affiliation;
    // Create new group if there isn't one yet
    if (!groups[groupAddr]) {
      groups[groupAddr] = {
        address: groupAddr,
        name: '',
        url: '',
        members: {},
        eligible: false,
        capacity: 0n,
        votes: 0n,
      };
    }
    // Create new validator group member
    const validatorStatus = electedSignersSet.has(valDetails.signer)
      ? ValidatorStatus.Elected
      : ValidatorStatus.NotElected;
    const validator: Validator = {
      address: valAddr,
      name: valName,
      score: valDetails.score,
      signer: valDetails.signer,
      status: validatorStatus,
    };
    groups[groupAddr].members[valAddr] = validator;
  }

  // // Remove 'null' group with unaffiliated validators
  if (groups[ZERO_ADDRESS]) {
    delete groups[ZERO_ADDRESS];
  }

  // Fetch details about the validator groups
  const groupAddrs = Object.keys(groups) as Address[];
  const groupNames = await fetchNamesForAccounts(publicClient, groupAddrs);
  for (let i = 0; i < groupAddrs.length; i++) {
    const groupAddr = groupAddrs[i];
    groups[groupAddr].name = groupNames[i] || groupAddr.substring(0, 10) + '...';
  }

  // Fetch vote-related details about the validator groups
  const { eligibleGroups, groupVotes, totalLocked, totalVotes } =
    await fetchVotesAndTotalLocked(publicClient);

  // Process vote-related details about the validator groups
  for (let i = 0; i < eligibleGroups.length; i++) {
    const groupAddr = eligibleGroups[i];
    const numVotes = groupVotes[i];
    const group = groups[groupAddr];
    group.eligible = true;
    group.votes = numVotes;
    group.capacity = getValidatorGroupCapacity(group, validatorAddrs.length, totalLocked);
  }

  return { groups: Object.values(groups), totalLocked, totalVotes };
}

async function fetchValidatorAddresses(publicClient: PublicClient) {
  const [validatorAddrsResp, electedSignersResp] = await publicClient.multicall({
    contracts: [
      {
        address: Addresses.Validators,
        abi: validatorsABI,
        functionName: 'getRegisteredValidators',
      },
      {
        address: Addresses.Election,
        abi: electionABI,
        functionName: 'getCurrentValidatorSigners',
      },
    ],
  });
  if (validatorAddrsResp.status !== 'success' || !validatorAddrsResp.result?.length) {
    throw new Error('No registered validators found');
  }
  if (electedSignersResp.status !== 'success' || !electedSignersResp.result?.length) {
    throw new Error('No elected signers found');
  }
  const validatorAddrs = validatorAddrsResp.result;
  const electedSignersSet = new Set(electedSignersResp.result);
  logger.debug(
    `Found ${validatorAddrs.length} validators and ${electedSignersSet.size} elected signers`,
  );
  return { validatorAddrs, electedSignersSet };
}

async function fetchValidatorDetails(publicClient: PublicClient, addresses: readonly Address[]) {
  // Fetch validator details, needed for their scores and signers
  // @ts-ignore Bug with viem 2.0 multicall types
  const validatorDetailsRaw: MulticallReturnType<any> = await publicClient.multicall({
    contracts: addresses.map((addr) => ({
      address: Addresses.Validators,
      abi: validatorsABI,
      functionName: 'getValidator',
      args: [addr],
    })),
  });

  // https://viem.sh/docs/faq.html#why-is-a-contract-function-return-type-returning-an-array-instead-of-an-object
  return validatorDetailsRaw.map((d, i) => {
    if (!d.result) throw new Error(`Validator details missing for index ${i}`);
    const result = d.result as [Address, Address, Address, bigint, Address];
    return {
      ecdsaPublicKey: result[0],
      blsPublicKey: result[1],
      affiliation: result[2],
      score: result[3],
      signer: result[4],
    };
  });
}

async function fetchNamesForAccounts(publicClient: PublicClient, addresses: readonly Address[]) {
  // @ts-ignore Bug with viem 2.0 multicall types
  const names: MulticallReturnType<any> = await publicClient.multicall({
    contracts: addresses.map((addr) => ({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'getName',
      args: [addr],
    })),
    allowFailure: true,
  });
  return names.map((n) => {
    if (!n.result) return null;
    return n.result as string;
  });
}

async function fetchVotesAndTotalLocked(publicClient: PublicClient) {
  const [votes, locked] = await publicClient.multicall({
    contracts: [
      {
        address: Addresses.Election,
        abi: electionABI,
        functionName: 'getTotalVotesForEligibleValidatorGroups',
      },
      {
        address: Addresses.LockedGold,
        abi: lockedGoldABI,
        functionName: 'getTotalLockedGold',
      },
    ],
  });

  if (votes.status !== 'success' || !votes.result?.length) {
    throw new Error('Error fetching group votes');
  }
  if (locked.status !== 'success' || !locked.result) {
    throw new Error('Error total locked CELO');
  }

  const eligibleGroups = votes.result[0];
  const groupVotes = votes.result[1];
  const totalVotes = bigIntSum(groupVotes);
  const totalLocked = locked.result;
  return { eligibleGroups, groupVotes, totalLocked, totalVotes };
}

function getValidatorGroupCapacity(
  group: ValidatorGroup,
  totalValidators: number,
  totalLocked: bigint,
): bigint {
  const numMembers = Object.keys(group.members).length;
  return BigInt(
    BigNumber(totalLocked.toString())
      .times(numMembers + 1)
      .div(Math.min(MAX_NUM_ELECTABLE_VALIDATORS, totalValidators))
      .toFixed(0),
  );
}
