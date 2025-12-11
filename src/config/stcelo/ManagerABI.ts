export default {
  address: '0x0239b96D10a434a56CC9E09383077A0490cF9398',
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: 'address',
          name: 'previousAdmin',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'address',
          name: 'newAdmin',
          type: 'address',
        },
      ],
      name: 'AdminChanged',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'beacon',
          type: 'address',
        },
      ],
      name: 'BeaconUpgraded',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'implementation',
          type: 'address',
        },
      ],
      name: 'Upgraded',
      type: 'event',
    },
    {
      stateMutability: 'payable',
      type: 'fallback',
    },
    {
      stateMutability: 'payable',
      type: 'receive',
    },
    {
      inputs: [],
      name: 'AddressZeroNotAllowed',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'caller',
          type: 'address',
        },
      ],
      name: 'CallerNotStakedCelo',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'caller',
          type: 'address',
        },
      ],
      name: 'CallerNotStrategy',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
      ],
      name: 'FromGroupNotOverflowing',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
      ],
      name: 'GroupNotEligible',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
      ],
      name: 'InvalidToGroup',
      type: 'error',
    },
    {
      inputs: [],
      name: 'OnlyPauser',
      type: 'error',
    },
    {
      inputs: [],
      name: 'Paused',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'actualCelo',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'expectedCelo',
          type: 'uint256',
        },
      ],
      name: 'RebalanceEnoughCelo',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'actualCelo',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'expectedCelo',
          type: 'uint256',
        },
      ],
      name: 'RebalanceNoExtraCelo',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
      ],
      name: 'ToGroupOverflowing',
      type: 'error',
    },
    {
      inputs: [],
      name: 'ZeroWithdrawal',
      type: 'error',
    },
    {
      anonymous: false,
      inputs: [],
      name: 'ContractPaused',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [],
      name: 'ContractUnpaused',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'previousOwner',
          type: 'address',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'newOwner',
          type: 'address',
        },
      ],
      name: 'OwnershipTransferred',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: 'address',
          name: 'pauser',
          type: 'address',
        },
      ],
      name: 'PauserSet',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
      ],
      name: 'StrategyChanged',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'voteContract',
          type: 'address',
        },
      ],
      name: 'VoteContractSet',
      type: 'event',
    },
    {
      inputs: [],
      name: 'PAUSED_POSITION',
      outputs: [
        {
          internalType: 'bytes32',
          name: '',
          type: 'bytes32',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'PAUSER_POSITION',
      outputs: [
        {
          internalType: 'bytes32',
          name: '',
          type: 'bytes32',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'newStrategy',
          type: 'address',
        },
      ],
      name: 'changeStrategy',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'defaultStrategy',
      outputs: [
        {
          internalType: 'contract IDefaultStrategy',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'deposit',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'accountAddress',
          type: 'address',
        },
      ],
      name: 'getAddressStrategy',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
      ],
      name: 'getExpectedAndActualCeloForGroup',
      outputs: [
        {
          internalType: 'uint256',
          name: 'expectedCelo',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'actualCelo',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'group',
          type: 'address',
        },
      ],
      name: 'getReceivableVotesForGroup',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getVersionNumber',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'pure',
      type: 'function',
    },
    {
      inputs: [],
      name: 'groupHealth',
      outputs: [
        {
          internalType: 'contract IGroupHealth',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_registry',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_owner',
          type: 'address',
        },
      ],
      name: 'initialize',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'isPaused',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'owner',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'pause',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'pauser',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'fromGroup',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'toGroup',
          type: 'address',
        },
      ],
      name: 'rebalance',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'fromGroup',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'toGroup',
          type: 'address',
        },
      ],
      name: 'rebalanceOverflow',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'registry',
      outputs: [
        {
          internalType: 'contract IRegistry',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'renounceOwnership',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'proposalId',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'index',
          type: 'uint256',
        },
      ],
      name: 'revokeVotes',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address[]',
          name: 'fromGroups',
          type: 'address[]',
        },
        {
          internalType: 'address[]',
          name: 'toGroups',
          type: 'address[]',
        },
        {
          internalType: 'uint256[]',
          name: 'fromVotes',
          type: 'uint256[]',
        },
        {
          internalType: 'uint256[]',
          name: 'toVotes',
          type: 'uint256[]',
        },
      ],
      name: 'scheduleTransferWithinStrategy',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_stakedCelo',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_account',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_vote',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_groupHealth',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_specificGroupStrategy',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_defaultStrategy',
          type: 'address',
        },
      ],
      name: 'setDependencies',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'setPauser',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'specificGroupStrategy',
      outputs: [
        {
          internalType: 'contract ISpecificGroupStrategy',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      name: 'strategies',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'stCELOAmount',
          type: 'uint256',
        },
      ],
      name: 'toCelo',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'celoAmount',
          type: 'uint256',
        },
      ],
      name: 'toStakedCelo',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'from',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'stCELOAmount',
          type: 'uint256',
        },
      ],
      name: 'transfer',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'newOwner',
          type: 'address',
        },
      ],
      name: 'transferOwnership',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'accountAddress',
          type: 'address',
        },
      ],
      name: 'unlockBalance',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'unpause',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'beneficiary',
          type: 'address',
        },
      ],
      name: 'updateHistoryAndReturnLockedStCeloInVoting',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'newImplementation',
          type: 'address',
        },
      ],
      name: 'upgradeTo',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'newImplementation',
          type: 'address',
        },
        {
          internalType: 'bytes',
          name: 'data',
          type: 'bytes',
        },
      ],
      name: 'upgradeToAndCall',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'voteContract',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'proposalId',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'index',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'yesVotes',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'noVotes',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'abstainVotes',
          type: 'uint256',
        },
      ],
      name: 'voteProposal',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'stCELOAmount',
          type: 'uint256',
        },
      ],
      name: 'withdraw',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_logic',
          type: 'address',
        },
        {
          internalType: 'bytes',
          name: '_data',
          type: 'bytes',
        },
      ],
      stateMutability: 'payable',
      type: 'constructor',
    },
  ],
} as const;
