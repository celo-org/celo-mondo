import * as CoreContractAbis from '@celo/abis';
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import database from 'src/config/database';
import { eventsTable } from 'src/db/schema';
import { getProposalTransactions } from 'src/features/governance/utils/transactionDecoder';
import { logger } from 'src/utils/logger';
import { fileURLToPath } from 'url';
import { Abi, keccak256, toHex } from 'viem';
// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

if (typeof process.env.NEXT_PUBLIC_CELOSCAN_API_KEY === 'string') {
  logger.info('Using celoscan with API key');
} else {
  logger.warn(
    'Celoscan api key not loaded. Votes will not be updated. You probably need a .env file (not local.env). To pull secrets see https://vercel.com/docs/cli/env',
  );
}

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const SELECTORS_OUT_PATH = path.resolve(__dirname, '../config/selectors.json');

async function main() {
  let cachedSelectors: Record<string, string> = {};
  if (fs.existsSync(SELECTORS_OUT_PATH)) {
    logger.info(`Reading cached selectors from file ${SELECTORS_OUT_PATH}`);
    cachedSelectors = JSON.parse(fs.readFileSync(SELECTORS_OUT_PATH, 'utf8'));
  }

  const values = Object.values(CoreContractAbis) as Abi[];
  values.push([
    {
      inputs: [{ internalType: 'bool', name: 'test', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      anonymous: false,
      inputs: [{ indexed: true, internalType: 'address', name: 'newBreakerBox', type: 'address' }],
      name: 'BreakerBoxUpdated',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'token', type: 'address' },
        { indexed: true, internalType: 'address', name: 'equivalentToken', type: 'address' },
      ],
      name: 'EquivalentTokenSet',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'token', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
      ],
      name: 'MedianUpdated',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'token', type: 'address' },
        { indexed: true, internalType: 'address', name: 'oracleAddress', type: 'address' },
      ],
      name: 'OracleAdded',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'token', type: 'address' },
        { indexed: true, internalType: 'address', name: 'oracleAddress', type: 'address' },
      ],
      name: 'OracleRemoved',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'token', type: 'address' },
        { indexed: true, internalType: 'address', name: 'oracle', type: 'address' },
      ],
      name: 'OracleReportRemoved',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'token', type: 'address' },
        { indexed: true, internalType: 'address', name: 'oracle', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
      ],
      name: 'OracleReported',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
        { indexed: true, internalType: 'address', name: 'newOwner', type: 'address' },
      ],
      name: 'OwnershipTransferred',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [{ indexed: false, internalType: 'uint256', name: 'reportExpiry', type: 'uint256' }],
      name: 'ReportExpirySet',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: false, internalType: 'address', name: 'token', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'reportExpiry', type: 'uint256' },
      ],
      name: 'TokenReportExpirySet',
      type: 'event',
    },
    {
      constant: false,
      inputs: [
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'address', name: 'oracleAddress', type: 'address' },
      ],
      name: 'addOracle',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'breakerBox',
      outputs: [{ internalType: 'contract IBreakerBox', name: '', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: false,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'deleteEquivalentToken',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'equivalentTokens',
      outputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'getEquivalentToken',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'getExchangeRate',
      outputs: [
        { internalType: 'uint256', name: 'numerator', type: 'uint256' },
        { internalType: 'uint256', name: 'denominator', type: 'uint256' },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'getOracles',
      outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'getRates',
      outputs: [
        { internalType: 'address[]', name: '', type: 'address[]' },
        { internalType: 'uint256[]', name: '', type: 'uint256[]' },
        {
          internalType: 'enum SortedLinkedListWithMedian.MedianRelation[]',
          name: '',
          type: 'uint8[]',
        },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'getTimestamps',
      outputs: [
        { internalType: 'address[]', name: '', type: 'address[]' },
        { internalType: 'uint256[]', name: '', type: 'uint256[]' },
        {
          internalType: 'enum SortedLinkedListWithMedian.MedianRelation[]',
          name: '',
          type: 'uint8[]',
        },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'getTokenReportExpirySeconds',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'getVersionNumber',
      outputs: [
        { internalType: 'uint256', name: '', type: 'uint256' },
        { internalType: 'uint256', name: '', type: 'uint256' },
        { internalType: 'uint256', name: '', type: 'uint256' },
        { internalType: 'uint256', name: '', type: 'uint256' },
      ],
      payable: false,
      stateMutability: 'pure',
      type: 'function',
    },
    {
      constant: false,
      inputs: [{ internalType: 'uint256', name: '_reportExpirySeconds', type: 'uint256' }],
      name: 'initialize',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'initialized',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'isOldestReportExpired',
      outputs: [
        { internalType: 'bool', name: '', type: 'bool' },
        { internalType: 'address', name: '', type: 'address' },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [
        { internalType: 'address', name: '', type: 'address' },
        { internalType: 'address', name: '', type: 'address' },
      ],
      name: 'isOracle',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'isOwner',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'medianRate',
      outputs: [
        { internalType: 'uint256', name: '', type: 'uint256' },
        { internalType: 'uint256', name: '', type: 'uint256' },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'medianRateWithoutEquivalentMapping',
      outputs: [
        { internalType: 'uint256', name: '', type: 'uint256' },
        { internalType: 'uint256', name: '', type: 'uint256' },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'medianTimestamp',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'numRates',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
      name: 'numTimestamps',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [
        { internalType: 'address', name: '', type: 'address' },
        { internalType: 'uint256', name: '', type: 'uint256' },
      ],
      name: 'oracles',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'owner',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'uint256', name: 'n', type: 'uint256' },
      ],
      name: 'removeExpiredReports',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'address', name: 'oracleAddress', type: 'address' },
        { internalType: 'uint256', name: 'index', type: 'uint256' },
      ],
      name: 'removeOracle',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [],
      name: 'renounceOwnership',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'uint256', name: 'value', type: 'uint256' },
        { internalType: 'address', name: 'lesserKey', type: 'address' },
        { internalType: 'address', name: 'greaterKey', type: 'address' },
      ],
      name: 'report',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'reportExpirySeconds',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: false,
      inputs: [{ internalType: 'contract IBreakerBox', name: 'newBreakerBox', type: 'address' }],
      name: 'setBreakerBox',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { internalType: 'address', name: 'token', type: 'address' },
        { internalType: 'address', name: 'equivalentToken', type: 'address' },
      ],
      name: 'setEquivalentToken',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [{ internalType: 'uint256', name: '_reportExpirySeconds', type: 'uint256' }],
      name: 'setReportExpiry',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { internalType: 'address', name: '_token', type: 'address' },
        { internalType: 'uint256', name: '_reportExpirySeconds', type: 'uint256' },
      ],
      name: 'setTokenReportExpiry',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'tokenReportExpirySeconds',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: false,
      inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
      name: 'transferOwnership',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const);

  for (const abi of values) {
    const functions = abi.filter((x) => x.type === 'function');
    const names = functions.map(
      (x) => `${x.name}(${x.inputs.map((input) => input.type).join(',')})`,
    );
    for (const name of names) {
      const selector = keccak256(toHex(name)).slice(0, 10);
      if (!cachedSelectors[selector]) {
        cachedSelectors[selector] = name;
      }
    }
  }

  logger.info('Fetching list of ProposalQueued events');
  const events = await database
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.eventName, 'ProposalQueued'));

  for (const event of events) {
    const args = event.args as unknown as { proposalId: string; transactionCount: string };
    const proposalId = parseInt(args.proposalId, 10);
    const transactionCount = parseInt(args.transactionCount, 10);

    if (transactionCount === 0) {
      continue;
    }

    try {
      logger.info(`Fetching txs for proposal ${proposalId}`);
      const transactions = await getProposalTransactions(
        proposalId,
        transactionCount,
        event.blockNumber,
      );

      // Decode each transaction
      await Promise.all(
        transactions.map(async (transaction) => {
          const selector = transaction.data.slice(0, 10);

          if (!cachedSelectors[selector]) {
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
            } = await fetch(
              `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`,
            ).then((x) => x.json());

            if (sig.count > 0) {
              cachedSelectors[selector] = sig.results.at(-1)!.text_signature;
            }
          }
        }),
      );
    } catch (error) {
      logger.error(`Error fetching transactions for proposal ${proposalId}`, error);
    }
  }

  logger.info(`Writing selectors to file ${SELECTORS_OUT_PATH}`);
  fs.writeFileSync(SELECTORS_OUT_PATH, JSON.stringify(cachedSelectors, null, 2), 'utf8');
}

main()
  .then(() => {
    logger.info('Done fetching proposals');
    process.exit(0);
  })
  .catch((error) => {
    logger.warn('Error fetching proposals', error);
    process.exit(1);
  });
