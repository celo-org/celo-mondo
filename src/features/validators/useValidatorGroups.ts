import {
  accountsABI,
  electionABI,
  epochManagerABI,
  lockedGoldABI,
  validatorsABI,
} from '@celo/abis';
import { PublicCeloClient } from '@celo/actions';
import { getScoreManagerContract } from '@celo/actions/contracts/score-manager';
import { useQuery } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useToastError } from 'src/components/notifications/useToastError';
import { GCTime, MAX_NUM_ELECTABLE_VALIDATORS, StaleTime, ZERO_ADDRESS } from 'src/config/consts';
import { Addresses, resolveAddress } from 'src/config/contracts';
import { logger } from 'src/utils/logger';
import { bigIntSum } from 'src/utils/math';
import { fromFixidity } from 'src/utils/numbers';
import { PublicClient } from 'viem';
import { usePublicClient } from 'wagmi';
import { Validator, ValidatorGroup, ValidatorStatus } from './types';

export function useValidatorGroups() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useValidatorGroups', publicClient],
    queryFn: () => {
      if (!publicClient) return null;
      logger.debug('Fetching validator groups');
      return fetchValidatorGroupInfo(publicClient);
    },
    gcTime: GCTime.Long,
    staleTime: StaleTime.Default,
  });

  useToastError(error, 'Error fetching validator groups');

  return {
    isLoading,
    isError,
    groups: data?.groups,
    addressToGroup: data?.addressToGroup,
    totalLocked: data?.totalLocked,
    totalVotes: data?.totalVotes,
  };
}

async function fetchValidatorGroupInfo(publicClient: PublicClient) {
  const { validatorAddrs, electedSignersSet } = await fetchValidatorAddresses(publicClient);

  const validatorDetails = await fetchValidatorDetails(publicClient, validatorAddrs);
  const validatorNames = await fetchNamesForAccounts(publicClient, validatorAddrs);
  const scoreManagerContract = await getScoreManagerContract({
    public: publicClient as PublicCeloClient,
  });

  if (
    validatorAddrs.length !== validatorDetails.length ||
    validatorAddrs.length !== validatorNames.length
  ) {
    throw new Error('Validator list / details size mismatch');
  }

  // Process validator lists to create list of validator groups
  const groups: AddressTo<ValidatorGroup> = {};
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
        lastSlashed: null,
        score: 0,
      };
    }
    // Create new validator group member
    const validatorStatus = electedSignersSet.has(valDetails.signer)
      ? ValidatorStatus.Elected
      : ValidatorStatus.NotElected;
    const validator: Validator = {
      address: valAddr,
      name: valName,
      score: 0,
      signer: valDetails.signer,
      status: validatorStatus,
    };
    groups[groupAddr].members[valAddr] = validator;
  }

  // // Remove 'null' group with unaffiliated validators
  if (groups[ZERO_ADDRESS]) {
    delete groups[ZERO_ADDRESS];
  }

  // NOTE: is this the most efficient way of getting all the scores?
  const groups_ = Object.values(groups);
  const validators_ = groups_.flatMap((group) => Object.values(group.members));
  const [groupScores, validatorScores] = await Promise.all([
    publicClient.multicall({
      allowFailure: false,
      contracts: groups_.map(
        (group) =>
          ({
            address: scoreManagerContract.address,
            abi: scoreManagerContract.abi,
            functionName: 'getGroupScore',
            args: [group.address],
          }) as const,
      ),
    }),
    publicClient.multicall({
      allowFailure: false,
      contracts: validators_.map(
        (validator) =>
          ({
            address: scoreManagerContract.address,
            abi: scoreManagerContract.abi,
            functionName: 'getValidatorScore',
            args: [validator.address],
          }) as const,
      ),
    }),
  ]);

  groups_.forEach((group, i) => {
    group.score = fromFixidity(groupScores[i]);
  });

  validators_.forEach((validator, i) => {
    validator.score = fromFixidity(validatorScores[i]);
  });

  // Fetch details about the validator groups
  const groupAddrs = Object.keys(groups) as Address[];
  const groupNames = await fetchNamesForAccounts(publicClient, groupAddrs);
  const groupSlashTimes = await fetchGroupLastSlashed(publicClient, groupAddrs);
  for (let i = 0; i < groupAddrs.length; i++) {
    const groupAddr = groupAddrs[i];
    groups[groupAddr].name = groupNames[i] || groupAddr.substring(0, 10) + '...';
    groups[groupAddr].lastSlashed = groupSlashTimes[i];
  }

  // Fetch vote-related total amounts
  const { eligibleGroups, groupVotes, totalLocked, totalVotes } =
    await fetchVotesAndTotalLocked(publicClient);

  // Process vote-related details about the validator groups
  for (let i = 0; i < eligibleGroups.length; i++) {
    const groupAddr = eligibleGroups[i];
    const group = groups[groupAddr];
    group.votes = groupVotes[i];
    group.eligible = true;
    group.capacity = getValidatorGroupCapacity(group, validatorAddrs.length, totalLocked);
  }
  const groupsWithIneligibleVotes = await setVotesForIneligibleGroups(publicClient, groups);

  return { groups: groupsWithIneligibleVotes, addressToGroup: groups, totalLocked, totalVotes };
}

/*
   Gets votes for groups that are ineligible as they could still be elected and could still have votes cast for them
   @returns array of all groups. 
  */
async function setVotesForIneligibleGroups(
  publicClient: PublicClient,
  groups: AddressTo<ValidatorGroup>,
): Promise<ValidatorGroup[]> {
  const groupsArray = Object.values(groups);
  const ineligibleGroups = groupsArray
    .filter((g) => g.votes === 0n)
    .filter((g) => g.eligible === false);

  if (ineligibleGroups.length === 0) {
    return groupsArray;
  }
  const activeVotesIneligibleGroups = await fetchActiveVotesForGroups(
    publicClient,
    ineligibleGroups,
  );
  const modifiedGroups = mergeVotesWithGroups(
    ineligibleGroups,
    activeVotesIneligibleGroups,
    groups,
  );

  return Object.values(modifiedGroups);
}
/*
  Merges the votes for ineligible groups into the groups object
  @param ineligibleGroupsWhichStillHaveElectedMembers - array of groups that are ineligible but still have votes
  @param activeVotesIneligibleGroups - array of votes for the ineligible groups
  @param groups - object of all groups
  @returns object of all groups with votes for ineligible groups merged in
*/
function mergeVotesWithGroups(
  ineligibleGroupsWhichStillHaveElectedMembers: ValidatorGroup[],
  activeVotesIneligibleGroups: (bigint | undefined)[],
  groups: AddressTo<ValidatorGroup>,
) {
  if (ineligibleGroupsWhichStillHaveElectedMembers.length !== activeVotesIneligibleGroups.length) {
    logger.error('length mismatch between groups and active votes');
    return groups;
  }
  const groupsAfterUpdates = { ...groups };
  ineligibleGroupsWhichStillHaveElectedMembers.forEach((group, i) => {
    const votes = activeVotesIneligibleGroups[i];
    if (typeof votes === 'bigint') {
      // add the votes for groups that are ineligible but still have votes
      // note this modifies the original groups object
      groupsAfterUpdates[group.address].votes = votes;
    }
  });
  return groupsAfterUpdates;
}

async function fetchActiveVotesForGroups(publicClient: PublicClient, groups: ValidatorGroup[]) {
  const votes = await publicClient.multicall({
    contracts: groups.map((group) => {
      return {
        address: Addresses.Election,
        abi: electionABI,
        functionName: 'getActiveVotesForGroup',
        args: [group.address],
      } as const;
    }),
  });
  // do NOT filter this we need the length to be the same as the original groups
  return votes.map((entry) => entry.result);
}

async function fetchValidatorAddresses(publicClient: PublicClient) {
  const [validatorAddrsResp, electedSignersResp] = await publicClient.multicall({
    contracts: [
      {
        address: Addresses.Validators,
        abi: validatorsABI,
        functionName: 'getRegisteredValidators',
      } as const,
      {
        address: await resolveAddress('EpochManager'),
        abi: epochManagerABI,
        functionName: 'getElectedSigners',
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
  const validatorDetailsRaw = await publicClient.multicall({
    contracts: addresses.map(
      (addr) =>
        ({
          address: Addresses.Validators,
          abi: validatorsABI,
          functionName: 'getValidator',
          args: [addr],
        }) as const,
    ),
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
  const results = await publicClient.multicall({
    contracts: addresses.map(
      (addr) =>
        ({
          address: Addresses.Accounts,
          abi: accountsABI,
          functionName: 'getName',
          args: [addr],
        }) as const,
    ),
    allowFailure: true,
  });
  return results.map((n) => {
    if (!n.result) return null;
    return n.result as string;
  });
}

async function fetchGroupLastSlashed(publicClient: PublicClient, addresses: readonly Address[]) {
  const results = await publicClient.multicall({
    contracts: addresses.map(
      (addr) =>
        ({
          address: Addresses.Validators,
          abi: validatorsABI,
          functionName: 'getValidatorGroup',
          args: [addr],
        }) as const,
    ),
    allowFailure: true,
  });
  return results.map((n) => {
    const result = n.result as
      | [Address, bigint, bigint, bigint, bigint[], bigint, bigint]
      | undefined;
    if (!result || !Array.isArray(result) || result.length < 7) return null;
    return Number(result[6]) * 1000;
  });
}

async function fetchVotesAndTotalLocked(publicClient: PublicClient) {
  const [votes, locked] = await publicClient.multicall({
    contracts: [
      {
        address: Addresses.Election,
        abi: electionABI,
        functionName: 'getTotalVotesForEligibleValidatorGroups',
      } as const,
      {
        address: Addresses.LockedGold,
        abi: lockedGoldABI,
        functionName: 'getTotalLockedGold',
      } as const,
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
