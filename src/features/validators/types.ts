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
  isHidden: boolean;
}
