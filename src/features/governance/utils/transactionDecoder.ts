/* eslint-disable no-console */
import { governanceABI } from '@celo/abis';
import { Addresses } from 'src/config/contracts';
import { celoPublicClient } from 'src/utils/client';
import { Address, decodeFunctionData, formatUnits } from 'viem';

export interface DecodedTransaction {
  to: Address;
  value: string;
  data: string;
  functionName: string;
  args: Record<string, any>;
  description: string | undefined;
  contractName: string;
}

export interface ProposalTransaction {
  index: number;
  to: Address;
  value: bigint;
  data: `0x${string}`;
  decoded?: DecodedTransaction;
  error?: string;
}

/**
 * Fetches all transactions for a given proposal
 */
export async function getProposalTransactions(
  proposalId: number,
  transactionCount: number,
  blockNumber: bigint,
): Promise<ProposalTransaction[]> {
  try {
    if (transactionCount === 0) {
      return [];
    }

    const baseCall = {
      abi: governanceABI,
      address: Addresses.Governance,
      functionName: 'getProposalTransaction',
    } as const;

    const transactions = await celoPublicClient.multicall({
      allowFailure: false,
      blockNumber,
      contracts: Array(transactionCount)
        .fill(1)
        .map((_, index) => ({
          ...baseCall,
          args: [BigInt(proposalId), BigInt(index)],
        })),
    });

    return transactions.map(([value, to, data], index) => ({
      value,
      to,
      data,
      index,
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching transactions for proposal ${proposalId}@${blockNumber}:`, error);
    return [];
  }
}

/**
 * Decodes a single transaction using common contract ABIs
 */
export async function decodeTransaction(
  transaction: ProposalTransaction,
): Promise<DecodedTransaction> {
  if (!transaction.data || transaction.data === '0x') {
    return {
      to: transaction.to,
      value: formatUnits(transaction.value, 18),
      data: '0x',
      functionName: 'native transfer',
      args: {},
      description: undefined,
      contractName: 'no contract interaction',
    };
  }

  try {
    return await decodeWithCommonSelectors(transaction);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error decoding transaction:', error);
    return {
      to: transaction.to,
      value: formatUnits(transaction.value, 18),
      data: transaction.data,
      functionName: 'unknown',
      args: {},
      description: undefined,
      contractName: getContractName(transaction.to),
    };
  }
}

/**
 * Decodes transactions using common function selectors when ABI is not available
 */

// Common function selectors
const commonSelectors = import('src/config/selectors.json');
const BASE_URL_4BYTE = `https://www.4byte.directory/api/v1/signatures`;

async function decodeWithCommonSelectors(
  transaction: ProposalTransaction,
): Promise<DecodedTransaction> {
  const selector = transaction.data.slice(0, 10);

  const selectors = (await commonSelectors).default;
  let selectorInfo: string | undefined = selectors[selector as keyof typeof selectors];
  if (!selectorInfo) {
    const sig: {
      count: number;
      next: number;
      previous: number;
      results: [
        {
          id: number;
          created_at: string;
          text_signature: string;
          hex_signature: `0x${string}`;
          bytes_signature: string;
        },
      ];
    } = await fetch(`${BASE_URL_4BYTE}/?hex_signature=${selector}`).then((x) => x.json());

    if (sig.count > 0) {
      const functionName = sig.results.at(-1)!.text_signature;
      // @ts-expect-error
      selectors[selector] = functionName;
      selectorInfo = functionName;
    }
  }

  if (selectorInfo) {
    const [, functionName, inputTypesStr] = (selectorInfo as string).match(/^(.+)\((.+)\)$/)!;
    const inputTypes = inputTypesStr.split(',');
    const decoded = decodeFunctionData({
      abi: [
        {
          type: 'function',
          name: functionName,
          inputs: inputTypes.map((type, index) => ({ name: index.toString(), type })),
        },
      ],
      data: transaction.data,
    });

    return {
      to: transaction.to,
      value: formatUnits(transaction.value, 18),
      data: transaction.data,
      functionName,
      args: decoded.args!.map((input, index) => `(${inputTypes[index]}) ${input}`),
      description: getTransactionDescription(decoded.functionName, decoded.args as any[]),
      contractName: getContractName(transaction.to),
    };
  }

  throw new Error('Couldnt decode transaction');
}

function getTransactionDescription(functionName: string, args: any[]) {
  switch (functionName) {
    case 'setRegistry':
      return `Set registry to ${args[0]}`;
    case 'setApprover':
      return `Set approver to ${args[0]}`;
    case 'setConcurrentProposals':
      return `Set concurrent proposals to ${args[0]}`;
    case 'setMinDeposit':
      return `Set minimum deposit to ${formatUnits(args[0], 18)} CELO`;
    case 'setQueueExpiry':
      return `Set queue expiry to ${args[0]} seconds`;
    case 'setDequeueFrequency':
      return `Set dequeue frequency to ${args[0]} seconds`;
    case 'setApprovalStageDuration':
      return `Set approval stage duration to ${args[0]} seconds`;
    case 'setReferendumStageDuration':
      return `Set referendum stage duration to ${args[0]} seconds`;
    case 'setExecutionStageDuration':
      return `Set execution stage duration to ${args[0]} seconds`;
    case 'setParticipationBaseline':
      return `Set participation baseline to ${formatUnits(args[0], 18)} CELO`;
    case 'setParticipationFloor':
      return `Set participation floor to ${formatUnits(args[0], 18)} CELO`;
    case 'setBaselineUpdateFactor':
      return `Set baseline update factor to ${formatUnits(args[0], 18)}`;
    case 'setBaselineQuorumFactor':
      return `Set baseline quorum factor to ${formatUnits(args[0], 18)}`;
    case 'transfer':
      return `Transfer tokens to ${args[0]}`;
    default:
      return undefined;
  }
}

const CONTRACTS: Record<string, string> = {
  // CORE CONTRACTS
  '0x9d65e69ac940dcb469fd7c46368c1e094250a400': 'Reserve',
  '0x7d21685c17607338b313a7174bab6620bad0aab7': 'Accounts',
  '0xdc553892cdeeed9f575aa0fba099e5847fd88d20': 'Attestations',
  '0x0ad5b1d0c25ecf6266dd951403723b2687d6aff2': 'FederatedAttestations',
  '0xae6b29f31b96e61dddc792f45fda4e4f0356d0cb': 'OdisPayments',
  '0x6e10a8864c65434a721d82e424d727326f9d5bfa': 'BlockchainParameters',
  '0x7a8c7a833565fc428cdfba20fe03fafb178a434f': 'CeloUnreleasedTreasury',
  '0x50c100bacde7e2b546371eb0be1eaccf0a6772ec': 'DoubleSigningSlasher',
  '0x71cac3b31c138f3327c6ca14f9a1c8d752463fdd': 'DowntimeSlasher',
  '0x8d6677192144292870907e3fa8a5527fe55a7ff6': 'Election',
  '0xf424b5e85b290b66ac20f8a9eab75e25a526725e': 'EpochManager',
  '0x2d4148c3500f696aa5a83dd4cc35c289b738b687': 'EpochManagerEnabler',
  '0x07f007d389883622ef8d4d347b3f78007f28d8b7': 'EpochRewards',
  '0xf4fa51472ca8d72af678975d9f8795a504e7ada5': 'Escrow',
  '0x67316300f17f063085ca8bca4bd3f7a5a3c66275': 'Exchange',
  '0xe383394b913d7302c49f794c7d3243c429d53d1d': 'ExchangeEUR',
  '0x15f344b9e6c3cb6f0376a36a64928b13f62c6276': 'FeeCurrencyDirectory',
  '0xbb024e9cdcb2f9e34d893630d19611b8a5381b3c': 'FeeCurrencyWhitelist',
  '0x47a472f45057a9d79d62c6427367016409f4ff5a': 'Freezer',
  '0xcd437749e43a154c07f3553504c68fbfd56b8778': 'FeeHandler',
  '0xdfca3a8d7699d8bafe656823ad60c17cb8270ecc': 'GasPriceMinimum',
  '0x471ece3750da237f93b8e339c536989b8978a438': 'CELO',
  '0xd533ca259b330c7a88f74e000a3faea2d63b7972': 'Governance',
  '0x03f6842b82dd2c9276931a17dd23d73c16454a49': 'GrandaMento',
  '0x6cc083aed9e3ebe302a6336dbc7c921c9f03349e': 'LockedGold (LockedCelo)',
  '0x4efa274b7e33476c961065000d58ee09f7921a74': 'MentoFeeHandlerSeller',
  '0x22a4aaf42a50bfa7238182460e32f15859c93dfe': 'Random',
  '0x000000000000000000000000000000000000ce10': 'Registry',
  '0x9380fa34fd9e4fd14c06305fd7b6199089ed4eb9': 'Reserve',
  '0xef3b9cc0fa4717af6f412d39dbceb89bf92f603b': 'ScoreManager',
  '0xefb84935239dacdecf7c5ba76d8de40b077b7b33': 'SortedOracles',
  '0xb49e4d6f0b7f8d0440f75697e6c8b37e09178bcf': 'TransferWhitelist',
  '0xd3aee28548dbb65df03981f0dc0713bfcbd10a97': 'UniswapFeeHandlerSeller',
  '0xaeb865bca93ddc8f47b8e29f40c5399ce34d0c58': 'Validators',

  // WHITELISTED TOKENS CONTRACTS
  '0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e': 'Tether USD',
  '0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72': 'Tether USD',
  '0x105d4a9306d2e55a71d2eb95b81553ae1dc20d7b': 'PUSO',
  '0xceba9300f2b948710d2653dd7b07f33a8b32118c': 'USDC',
  '0x2f25deb3848c207fc8e0c34035b3ba7fc157602b': 'USDC',
  '0x456a3d042c0dbd3db53d5489e98dfb038553b0d0': 'Celo Kenyan Shilling',
  '0x4c35853a3b4e647fd266f4de678dcc8fec410bf6': 'Celo South African Rand',
  '0x7175504c455076f15c04a2f90a8e352281f492f9': 'Celo Australian Dollar',
  '0x73f93dcc49cb8a239e2032663e9475dd5ef29a08': 'ECO CFA',
  '0x765de816845861e75a25fca122bb6898b8b1282a': 'Celo Dollar',
  '0x8a567e2ae79ca692bd748ab832081c45de4041ea': 'Celo Colombian Peso',
  '0xccf663b1ff11028f0b19058d0f7b674004a40746': 'Celo British Pound',
  '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73': 'Celo Euro',
  '0xe2702bd97ee33c88c8f6f92da3b733608aa76f71': 'Celo Nigerian Naira',
  '0xb55a79f398e759e43c95b979163f30ec87ee131d': 'Celo Swiss Franc',
  '0xc45ecf20f3cd864b32d9794d6f76814ae8892e20': 'Celo Japanese Yen',
  '0xe8537a3d056da446677b9e9d6c5db704eaab4787': 'Celo Brazilian Real',
  '0xfaea5f3404bba20d3cc2f8c4b0a888f55a3c7313': 'Celo Ghanaian Cedi',
  '0xff4ab19391af240c311c54200a492233052b6325': 'Celo Canadian Dollar',
};
export function getContractName(address: Address): string {
  if (!address) {
    return 'Unknown Contract';
  }

  return CONTRACTS[address.toLowerCase()] || 'Unknown Contract';
}
