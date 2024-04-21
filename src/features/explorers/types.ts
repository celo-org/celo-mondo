export interface ExplorerResponse<R> {
  status: string;
  message: string;
  result: R;
}

export interface TransactionLog {
  address: Address;
  blockNumber: HexString;
  blockHash: HexString;
  data: HexString;
  gasUsed: HexString;
  gasPrice: HexString;
  logIndex: HexString;
  transactionIndex: HexString;
  transactionHash: HexString;
  topics: [HexString, ...Array<HexString>];
  timeStamp: HexString;
}
