/*
  Validators
*/

export interface ValidatorGroup {
  address: Address;
  name: string;
  url: string;
  eligible: boolean;
  capacity: bigint;
  votes: bigint;
  lastSlashed: number | null; // timestamp
  members: AddressTo<Validator>;
  score: number;
  commission: number | null; // voter reward commission as a fraction (0–1); null if the read failed
  slashingMultiplier: number | null; // 0–1, drops below 1 after a slash and scales voter rewards; null if the read failed
  meetsLockedGoldRequirement: boolean | null; // groups below the locked CELO requirement earn no voter rewards; null if the read failed
  validStCeloGroup?: boolean;
}

export enum ValidatorStatus {
  NotElected = 0,
  Elected = 1,
}

export interface Validator {
  address: Address;
  name: string;
  score: number;
  signer: Address;
  status: ValidatorStatus;
}

export enum ValidatorGroupStatus {
  Poor = -1,
  Full = 0,
  Okay = 1,
  Good = 2,
}

/*
  Table Data
*/

export interface ValidatorGroupRow extends ValidatorGroup {
  numElected: number;
  numMembers: number;
  isContributor: boolean;
  apy?: number; // projected yearly return in percent, unset until the network rate loads
  apyBreakdown?: string; // hover text explaining how apy was derived
}
