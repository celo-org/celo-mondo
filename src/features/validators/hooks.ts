import { accountsABI, electionABI, validatorsABI } from '@celo/abis';
import { useQuery } from '@tanstack/react-query';
import { Addresses } from 'src/config/contracts';
// import { getContract } from 'viem';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { ZERO_ADDRESS } from 'src/config/consts';
import { logger } from 'src/utils/logger';
import { PublicClient, usePublicClient } from 'wagmi';
import { Validator, ValidatorGroup, ValidatorStatus } from './types';

export function useValidatorGroups() {
  const publicClient = usePublicClient();

  const { isLoading, isError, error, data } = useQuery({
    queryKey: ['useValidatorGroups', publicClient],
    queryFn: async () => {
      logger.debug('Fetching validator groups');
      const groups = await fetchValidatorGroupInfo(publicClient);
      return groups;
    },
    gcTime: Infinity,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (error) {
      logger.error(error);
      toast.error('Error fetching validator groups');
    }
  }, [error]);

  return {
    isLoading,
    isError,
    groups: data,
  };
}

async function fetchValidatorGroupInfo(publicClient: PublicClient) {
  // Get contracts
  // const cAccounts = getContract({
  //   address: Addresses.Accounts,
  //   abi: accountsABI,
  //   publicClient,
  // });
  // const cValidators = getContract({
  //   address: Addresses.Validators,
  //   abi: validatorsABI,
  //   publicClient,
  // });
  // const cElections = getContract({
  //   address: Addresses.Election,
  //   abi: electionABI,
  //   publicClient,
  // });

  // Fetch list of validators and list of elected signers
  // const validatorAddrsP = cValidators.read.getRegisteredValidators()
  // const electedSignersP = cElections.read.getCurrentValidatorSigners()
  // const [validatorAddrs, electedSigners] = await Promise.all([validatorAddrsP, electedSignersP])
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

  // Fetch validator details, needed for their scores and signers
  const validatorDetailsRaw = await publicClient.multicall({
    contracts: validatorAddrs.map((addr) => ({
      address: Addresses.Validators,
      abi: validatorsABI,
      functionName: 'getValidator',
      args: [addr],
    })),
  });

  // https://viem.sh/docs/faq.html#why-is-a-contract-function-return-type-returning-an-array-instead-of-an-object
  const validatorDetails = validatorDetailsRaw.map((d, i) => {
    if (!d.result) throw new Error(`Validator details missing for index ${i}`);
    return {
      ecdsaPublicKey: d.result[0],
      blsPublicKey: d.result[1],
      affiliation: d.result[2],
      score: d.result[3],
      signer: d.result[4],
    };
  });
  console.log(validatorDetails);

  const validatorNames = await publicClient.multicall({
    contracts: validatorAddrs.map((addr) => ({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'getName',
      args: [addr],
    })),
    allowFailure: true,
  });

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
    const valName = validatorNames[i].result || '';
    const groupAddr = valDetails.affiliation;
    // Create new group if there isn't one yet
    if (!groups[groupAddr]) {
      groups[groupAddr] = {
        address: groupAddr,
        name: '',
        url: '',
        members: {},
        eligible: false,
        capacity: '0',
        votes: '0',
      };
    }
    // Create new validator group member
    const validatorStatus = electedSignersSet.has(valDetails.signer)
      ? ValidatorStatus.Elected
      : ValidatorStatus.NotElected;
    const validator: Validator = {
      address: valAddr,
      name: valName,
      score: valDetails.score.toString(),
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
  const groupNames = await publicClient.multicall({
    contracts: groupAddrs.map((addr) => ({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'getName',
      args: [addr],
    })),
    allowFailure: true,
  });

  // Process details about the validator groups
  for (let i = 0; i < groupAddrs.length; i++) {
    const groupAddr = groupAddrs[i];
    groups[groupAddr].name = groupNames[i].result || groupAddr.substring(0, 10) + '...';
  }

  // // Fetch vote-related details about the validator groups
  // const { eligibleGroups, groupVotes, totalLocked } = await fetchVotesAndTotalLocked()

  // // Process vote-related details about the validator groups
  // for (let i = 0; i < eligibleGroups.length; i++) {
  //   const groupAddr = eligibleGroups[i]
  //   const numVotes = groupVotes[i]
  //   const group = groups[groupAddr]
  //   group.eligible = true
  //   group.capacity = getValidatorGroupCapacity(group, validatorAddrs.length, totalLocked)
  //   group.votes = numVotes.toString()
  // }

  return Object.values(groups);
}

// Just fetch latest vote counts, not the entire groups + validators info set
// async function fetchValidatorGroupVotes(groups: ValidatorGroup[]) {
//   let totalValidators = groups.reduce((total, g) => total + Object.keys(g.members).length, 0)
//   // Only bother to fetch actual num validators on the off chance there are fewer members than MAX
//   if (totalValidators < MAX_NUM_ELECTABLE_VALIDATORS) {
//     const validators = getContract(CeloContract.Validators)
//     const validatorAddrs: string[] = await validators.getRegisteredValidators()
//     totalValidators = validatorAddrs.length
//   }

//   // Fetch vote-related details about the validator groups
//   const { eligibleGroups, groupVotes, totalLocked } = await fetchVotesAndTotalLocked()

//   // Create map from list provided
//   const groupsMap: Record<string, ValidatorGroup> = {}
//   for (const group of groups) {
//     groupsMap[group.address] = { ...group }
//   }

//   // Process vote-related details about the validator groups
//   for (let i = 0; i < eligibleGroups.length; i++) {
//     const groupAddr = eligibleGroups[i]
//     const numVotes = groupVotes[i]
//     const group = groupsMap[groupAddr]
//     if (!group) {
//       logger.warn('No group found matching votes, group list must be stale')
//       continue
//     }
//     group.eligible = true
//     group.capacity = getValidatorGroupCapacity(group, totalValidators, totalLocked)
//     group.votes = numVotes.toString()
//   }
//   return Object.values(groupsMap)
// }

// async function fetchVotesAndTotalLocked() {
//   const lockedGold = getContract(CeloContract.LockedGold)
//   const election = getContract(CeloContract.Election)
//   const votesP: Promise<EligibleGroupsVotesRaw> = election.getTotalVotesForEligibleValidatorGroups()
//   const totalLockedP: Promise<BigNumberish> = lockedGold.getTotalLockedGold()
//   const [votes, totalLocked] = await Promise.all([votesP, totalLockedP])
//   const eligibleGroups = votes[0]
//   const groupVotes = votes[1]
//   return { eligibleGroups, groupVotes, totalLocked }
// }

// function getValidatorGroupCapacity(
//   group: ValidatorGroup,
//   totalValidators: number,
//   totalLocked: BigNumberish
// ) {
//   const numMembers = Object.keys(group.members).length
//   return BigNumber.from(totalLocked)
//     .mul(numMembers + 1)
//     .div(Math.min(MAX_NUM_ELECTABLE_VALIDATORS, totalValidators))
//     .toString()
// }
