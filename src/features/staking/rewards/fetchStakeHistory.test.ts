import { TransactionLog } from 'src/features/explorers/types';
import { parseStakeLogs } from 'src/features/staking/rewards/fetchStakeHistory';
import { StakeEventType } from 'src/features/staking/types';
import { toWei } from 'src/utils/amount';

const ACTIVATE_LOGS: TransactionLog[] = [
  {
    address: '0x8d6677192144292870907e3fa8a5527fe55a7ff6',
    topics: [
      '0x45aac85f38083b18efe2d441a65b9c1ae177c78307cb5a5d4aec8f7dbcaeabfe',
      '0x000000000000000000000000e687aa0b72c3ced23c134effe99cbc4908eddede',
      '0x00000000000000000000000035ae10f412503abcf9275133613e8df7f56e72be',
    ],
    data: '0x0000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000047cb9508cc12bd59b581cd94b7934492',
    blockNumber: '0x580ccb',
    blockHash: '0x8dc60646aa52707989b0545a9ae1bf73ef5ab2c6f131baa2030b1e1b5cad35df',
    timeStamp: '0x6058bd3e',
    gasPrice: '0x1dcd6500',
    gasUsed: '0x11fec',
    logIndex: '0x2',
    transactionHash: '0x55468df7c7c5a71048be4c1b7a6f9e014db914f5e1bf18873b96960c61404092',
    transactionIndex: '0x3',
  },
  {
    address: '0x8d6677192144292870907e3fa8a5527fe55a7ff6',
    topics: [
      '0x45aac85f38083b18efe2d441a65b9c1ae177c78307cb5a5d4aec8f7dbcaeabfe',
      '0x000000000000000000000000e687aa0b72c3ced23c134effe99cbc4908eddede',
      '0x0000000000000000000000002c2b0f71d59b546b2cafd222696589c13c3c325c',
    ],
    data: '0x00000000000000000000000000000000000000000000000006f05b59d3b200000000000000000000000000000000000023363c43c96ea39ae630bd230675d24b',
    blockNumber: '0x7c2aae',
    blockHash: '0x94f3a02c4f8f692c4344cb065ce49608801a48cb2207f1700dd9d85f76d4343b',
    timeStamp: '0x610d5560',
    gasPrice: '0x1dcd6500',
    gasUsed: '0xade0',
    logIndex: '0x',
    transactionHash: '0x349104c90aa03dc22ed1b9bf413aa27651b33bb3bae2d9e73ea9d48453fcfa66',
    transactionIndex: '0x',
  },
];

const REVOKE_LOGS: TransactionLog[] = [
  {
    address: '0x8d6677192144292870907e3fa8a5527fe55a7ff6',
    topics: [
      '0xae7458f8697a680da6be36406ea0b8f40164915ac9cc40c0dad05a2ff6e8c6a8',
      '0x000000000000000000000000e687aa0b72c3ced23c134effe99cbc4908eddede',
      '0x00000000000000000000000035ae10f412503abcf9275133613e8df7f56e72be',
    ],
    data: '0x0000000000000000000000000000000000000000000000000de85df8bfd2df2f0000000000000000000000000000000047cb9508cc12bd59b581cd94b7934492',
    blockNumber: '0x5bc775',
    blockHash: '0xba9a9c96c149d01bdde624b08c747a777dd043e73d6db4a4add310251fc93261',
    timeStamp: '0x606b62c6',
    gasPrice: '0x1dcd6500',
    gasUsed: '0x1757d',
    logIndex: '0x',
    transactionHash: '0x562a9d97a191c658b3bc5981cbf7b8d55e4cbcdaaf15f4fccc0a8408ff54b1a6',
    transactionIndex: '0x',
  },
  {
    address: '0x8d6677192144292870907e3fa8a5527fe55a7ff6',
    topics: [
      '0xae7458f8697a680da6be36406ea0b8f40164915ac9cc40c0dad05a2ff6e8c6a8',
      '0x000000000000000000000000e687aa0b72c3ced23c134effe99cbc4908eddede',
      '0x00000000000000000000000034649ada2cb44d851a2103feaa8922deddabfc1c',
    ],
    data: '0x000000000000000000000000000000000000000000000000077084e7d02ca7f50000000000000000000000000000000022f97377ebd1a6726124984d5bce80ae',
    blockNumber: '0x142eee1',
    blockHash: '0x99060daf0c383dccafe5ce9a85d8de88823a67a9300d53ae3765bc34542e6779',
    timeStamp: '0x64f09068',
    gasPrice: '0x5d21dba00',
    gasUsed: '0x1ea54',
    logIndex: '0x23',
    transactionHash: '0x8798763cb8bb9c0c975df54ab98edebb8469f1c567dfad29ea27041587ebbcea',
    transactionIndex: '0x9',
  },
];

describe('Parses stake logs correctly', () => {
  it('For activation logs', () => {
    const events = parseStakeLogs(
      ACTIVATE_LOGS,
      '0xE687AA0B72c3Ced23C134eFfe99cBC4908edDeDe',
      StakeEventType.Activate,
    );
    expect(events.length).toEqual(2);
    expect(events[0].value).toEqual(toWei(1));
  });
  it('For revocation logs', () => {
    const events = parseStakeLogs(
      REVOKE_LOGS,
      '0xE687AA0B72c3Ced23C134eFfe99cBC4908edDeDe',
      StakeEventType.Revoke,
    );
    expect(events.length).toEqual(2);
    expect(events[0].value).toEqual(1002154240041475887n);
  });
});
