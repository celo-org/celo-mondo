import { electionABI } from '@celo/abis';
import BigNumber from 'bignumber.js';
import { Addresses } from 'src/config/contracts';
import { links } from 'src/config/links';
import { queryCeloscan } from 'src/features/explorers/celoscan';
import { TransactionLog } from 'src/features/explorers/types';
import { StakeEvent, StakeEventType } from 'src/features/staking/types';
import { ensure0x, eqAddress, isValidAddress, strip0x } from 'src/utils/addresses';
import { logger } from 'src/utils/logger';
import { isNullish } from 'src/utils/typeof';
import { decodeEventLog } from 'viem';

//ValidatorGroupVoteActivated(address,address,uint256,uint256)
const VOTE_ACTIVATED_TOPIC_0 = '0x45aac85f38083b18efe2d441a65b9c1ae177c78307cb5a5d4aec8f7dbcaeabfe';
//ValidatorGroupActiveVoteRevoked(address,address,uint256,uint256)
const VOTE_REVOKED_TOPIC_0 = '0xae7458f8697a680da6be36406ea0b8f40164915ac9cc40c0dad05a2ff6e8c6a8';

export async function fetchStakeEvents(accountAddress: Address, fromBlockNumber?: number) {
  const electionAddress = Addresses.Election;
  const fromBlock = fromBlockNumber ? fromBlockNumber : 100; // Not using block 0 here because of some explorers have issues with incorrect txs in low blocks
  const topic1 = getPaddedAddress(accountAddress).toLowerCase();
  const baseUrl = `${links.celoscanApi}/api?module=logs&action=getLogs&fromBlock=${fromBlock}&toBlock=latest&address=${electionAddress}&topic1=${topic1}&topic0_1_opr=and`;

  const activateLogsUrl = `${baseUrl}&topic0=${VOTE_ACTIVATED_TOPIC_0}`;
  const activeTxLogs = await queryCeloscan<Array<TransactionLog>>(activateLogsUrl);
  const activateEvents = parseStakeLogs(activeTxLogs, accountAddress, StakeEventType.Activate);

  const revokeLogsUrl = `${baseUrl}&topic0=${VOTE_REVOKED_TOPIC_0}`;
  const revokeTxLogs = await queryCeloscan<Array<TransactionLog>>(revokeLogsUrl);
  const revokeEvents = parseStakeLogs(revokeTxLogs, accountAddress, StakeEventType.Revoke);
  return activateEvents.concat(revokeEvents).sort((a, b) => a.timestamp - b.timestamp);
}

export function parseStakeLogs(
  logs: Array<TransactionLog>,
  accountAddress: Address,
  type: StakeEventType,
): StakeEvent[] {
  const logDescriptionName =
    type === StakeEventType.Activate
      ? 'ValidatorGroupVoteActivated'
      : 'ValidatorGroupActiveVoteRevoked';
  const stakeEvents: StakeEvent[] = [];

  for (const log of logs) {
    try {
      const filteredTopics = log.topics.filter((t) => !!t);
      if (!filteredTopics.length) continue;
      const logDescription = decodeEventLog({
        abi: electionABI,
        // @ts-ignore https://github.com/wevm/viem/issues/381
        topics: filteredTopics,
        data: log.data,
        strict: false,
      });

      if (logDescription?.eventName !== logDescriptionName)
        throw new Error(`Unexpected log name: ${logDescription.eventName}`);
      const { account, group, value, units } = logDescription.args;
      if (!account || !eqAddress(account, accountAddress))
        throw new Error(`Unexpected account address: ${account}`);
      if (!group || !isValidAddress(group)) throw new Error(`Invalid group address: ${group}`);
      if (isNullish(value) || value < 0n) throw new Error(`Invalid value: ${value}`);
      if (isNullish(units) || units < 0n) throw new Error(`Invalid units: ${units}`);

      const timestamp = BigNumber(ensure0x(log.timeStamp)).times(1000);
      if (timestamp.lte(0)) throw new Error(`Invalid timestamp: ${log.timeStamp}`);
      const blockNumber = BigNumber(ensure0x(log.blockNumber));
      if (blockNumber.lte(0)) throw new Error(`Invalid block number: ${log.blockNumber}`);

      stakeEvents.push({
        type,
        group,
        value,
        units,
        blockNumber: blockNumber.toNumber(),
        timestamp: timestamp.toNumber(),
        txHash: log.transactionHash,
      });
    } catch (error) {
      logger.warn('Unable to parse stake log, will skip', error);
    }
  }
  return stakeEvents;
}

function getPaddedAddress(address: Address) {
  return ensure0x(strip0x(address).padStart(64, '0'));
}
