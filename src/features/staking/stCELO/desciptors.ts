import { ZERO_ADDRESS } from 'src/config/consts';
import { ValidatorGroup } from 'src/features/validators/types';

export const DEFAULT_STRATEGY: ValidatorGroup = {
  address: ZERO_ADDRESS,
  name: 'StCelo Basket',
  lastSlashed: 0,
  url: 'https://forum.celo.org/t/stcelo-launch-on-friday-feedback-on-our-plan-for-validator-election/3897',
  eligible: true,
  capacity: 100000000000000000000000000n, // 100 million artifical limit
  votes: 0n,
  score: 1,
  // @ts-expect-error -- filled in later
  members: [],
};
