export default {
  address: '0x3A3ed74B1cC543D5EB323f70ac2F19977a0eA088',
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
      name: 'CallerNotManager',
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
      name: 'CallerNotManagerNorStrategy',
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
      name: 'GroupAlreadyAdded',
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
      name: 'GroupNotActivatable',
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
      name: 'GroupNotActive',
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
      name: 'HealthyGroup',
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
      name: 'InvalidFromGroup',
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
      name: 'MinimumCountOfActiveGroupsReached',
      type: 'error',
    },
    {
      inputs: [],
      name: 'NoActiveGroups',
      type: 'error',
    },
    {
      inputs: [],
      name: 'NotAbleToDistributeVotes',
      type: 'error',
    },
    {
      inputs: [],
      name: 'NotUnsortedGroup',
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
      name: 'RebalanceEnoughStCelo',
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
      name: 'RebalanceNoExtraStCelo',
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
          name: 'group',
          type: 'address',
        },
      ],
      name: 'GroupActivated',
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
      name: 'GroupRemoved',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'manager',
          type: 'address',
        },
      ],
      name: 'ManagerSet',
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
          indexed: false,
          internalType: 'bool',
          name: 'update',
          type: 'bool',
        },
      ],
      name: 'SortedFlagUpdated',
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
      inputs: [],
      name: 'account',
      outputs: [
        {
          internalType: 'contract IAccount',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'activatableGroupsCount',
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
          name: 'group',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'lesser',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'greater',
          type: 'address',
        },
      ],
      name: 'activateGroup',
      outputs: [],
      stateMutability: 'nonpayable',
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
      name: 'addActivatableGroup',
      outputs: [],
      stateMutability: 'nonpayable',
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
      name: 'deactivateGroup',
      outputs: [],
      stateMutability: 'nonpayable',
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
      name: 'deactivateUnhealthyGroup',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'celoAmount',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'depositGroupToIgnore',
          type: 'address',
        },
      ],
      name: 'generateDepositVoteDistribution',
      outputs: [
        {
          internalType: 'address[]',
          name: 'finalGroups',
          type: 'address[]',
        },
        {
          internalType: 'uint256[]',
          name: 'finalVotes',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'nonpayable',
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
      name: 'generateWithdrawalVoteDistribution',
      outputs: [
        {
          internalType: 'address[]',
          name: 'finalGroups',
          type: 'address[]',
        },
        {
          internalType: 'uint256[]',
          name: 'finalVotes',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'index',
          type: 'uint256',
        },
      ],
      name: 'getActivatableGroupAt',
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
      name: 'getExpectedAndActualStCeloForGroup',
      outputs: [
        {
          internalType: 'uint256',
          name: 'expectedStCelo',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'actualStCelo',
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
      name: 'getGroupPreviousAndNext',
      outputs: [
        {
          internalType: 'address',
          name: 'previousAddress',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'nextAddress',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getGroupsHead',
      outputs: [
        {
          internalType: 'address',
          name: 'head',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'previousAddress',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getGroupsTail',
      outputs: [
        {
          internalType: 'address',
          name: 'tail',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'nextAddress',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getNumberOfGroups',
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
      name: 'getNumberOfUnsortedGroups',
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
          name: 'index',
          type: 'uint256',
        },
      ],
      name: 'getUnsortedGroupAt',
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
          name: '_owner',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '_manager',
          type: 'address',
        },
      ],
      name: 'initialize',
      outputs: [],
      stateMutability: 'nonpayable',
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
      name: 'isActive',
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
      name: 'manager',
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
      name: 'maxGroupsToDistributeTo',
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
      name: 'maxGroupsToWithdrawFrom',
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
      name: 'minCountOfActiveGroups',
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
      inputs: [],
      name: 'renounceOwnership',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_account',
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
      ],
      name: 'setDependencies',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_manager',
          type: 'address',
        },
      ],
      name: 'setManager',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'minCount',
          type: 'uint256',
        },
      ],
      name: 'setMinCountOfActiveGroups',
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
      inputs: [
        {
          internalType: 'uint256',
          name: 'distributeTo',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'withdrawFrom',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'loopLimit',
          type: 'uint256',
        },
      ],
      name: 'setSortingParams',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'sorted',
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
      name: 'stCeloInGroup',
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
      name: 'totalStCeloInStrategy',
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
          name: 'group',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'lesserKey',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'greaterKey',
          type: 'address',
        },
      ],
      name: 'updateActiveGroupOrder',
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
  transactionHash: '0x1967b9471a6ecde3afb066985cdfd98aa648029e8e1ff6a5788c931bf218f00f',
  receipt: {
    to: null,
    from: '0x5bC1C4C1D67C5E4384189302BC653A611568a788',
    contractAddress: '0x3A3ed74B1cC543D5EB323f70ac2F19977a0eA088',
    transactionIndex: 14,
    gasUsed: '501239',
    logsBloom:
      '0x00000000000000000000010000000000400000000000000000820000000000800000000000000000000000000000000008000000000000000008000000000000080000000000000000000000000002000001000000000000000000000000000000000000020000000000001000000800000000000000000001080000000000400000000100000000000000000000000000080600000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000080080000020000000000000000000000001000000000000000000000000000000000000000002',
    blockHash: '0x5ed0281619a616149db2ff39e97b1b62b460ef79173789b0aacb3c9b8fdf3a01',
    transactionHash: '0x1967b9471a6ecde3afb066985cdfd98aa648029e8e1ff6a5788c931bf218f00f',
    logs: [
      {
        transactionIndex: 14,
        blockNumber: 19918407,
        transactionHash: '0x1967b9471a6ecde3afb066985cdfd98aa648029e8e1ff6a5788c931bf218f00f',
        address: '0x3A3ed74B1cC543D5EB323f70ac2F19977a0eA088',
        topics: [
          '0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b',
          '0x000000000000000000000000f0b67ab98dd5725565cf96496b5eda455622f7ff',
        ],
        data: '0x',
        logIndex: 44,
        blockHash: '0x5ed0281619a616149db2ff39e97b1b62b460ef79173789b0aacb3c9b8fdf3a01',
      },
      {
        transactionIndex: 14,
        blockNumber: 19918407,
        transactionHash: '0x1967b9471a6ecde3afb066985cdfd98aa648029e8e1ff6a5788c931bf218f00f',
        address: '0x3A3ed74B1cC543D5EB323f70ac2F19977a0eA088',
        topics: [
          '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x0000000000000000000000005bc1c4c1d67c5e4384189302bc653a611568a788',
        ],
        data: '0x',
        logIndex: 45,
        blockHash: '0x5ed0281619a616149db2ff39e97b1b62b460ef79173789b0aacb3c9b8fdf3a01',
      },
      {
        transactionIndex: 14,
        blockNumber: 19918407,
        transactionHash: '0x1967b9471a6ecde3afb066985cdfd98aa648029e8e1ff6a5788c931bf218f00f',
        address: '0x3A3ed74B1cC543D5EB323f70ac2F19977a0eA088',
        topics: [
          '0x60a0f5b9f9e81e98216071b85826681c796256fe3d1354ecb675580fba64fa69',
          '0x0000000000000000000000000239b96d10a434a56cc9e09383077a0490cf9398',
        ],
        data: '0x',
        logIndex: 46,
        blockHash: '0x5ed0281619a616149db2ff39e97b1b62b460ef79173789b0aacb3c9b8fdf3a01',
      },
      {
        transactionIndex: 14,
        blockNumber: 19918407,
        transactionHash: '0x1967b9471a6ecde3afb066985cdfd98aa648029e8e1ff6a5788c931bf218f00f',
        address: '0x3A3ed74B1cC543D5EB323f70ac2F19977a0eA088',
        topics: ['0xb930683f0749189780c4016ec37d019eb0cbbf6550ce7374fac5cfbae93909a7'],
        data: '0x0000000000000000000000000000000000000000000000000000000000000001',
        logIndex: 47,
        blockHash: '0x5ed0281619a616149db2ff39e97b1b62b460ef79173789b0aacb3c9b8fdf3a01',
      },
    ],
    blockNumber: 19918407,
    cumulativeGasUsed: '1927432',
    status: 1,
    byzantium: true,
  },
  args: [
    '0xf0B67Ab98DD5725565cF96496B5eDA455622F7Ff',
    '0x485cc9550000000000000000000000005bc1c4c1d67c5e4384189302bc653a611568a7880000000000000000000000000239b96d10a434a56cc9e09383077a0490cf9398',
  ],
  numDeployments: 2,
  solcInputHash: '27c7c680112f4cbd9a19d8d22fcc316c',
  metadata:
    '{"compiler":{"version":"0.8.11+commit.d7f03943"},"language":"Solidity","output":{"abi":[{"inputs":[{"internalType":"address","name":"_logic","type":"address"},{"internalType":"bytes","name":"_data","type":"bytes"}],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"stateMutability":"payable","type":"receive"}],"devdoc":{"details":"This contract implements an upgradeable proxy. It is upgradeable because calls are delegated to an implementation address that can be changed. This address is stored in storage in the location specified by https://eips.ethereum.org/EIPS/eip-1967[EIP1967], so that it doesn\'t conflict with the storage layout of the implementation behind the proxy.","kind":"dev","methods":{"constructor":{"details":"Initializes the upgradeable proxy with an initial implementation specified by `_logic`. If `_data` is nonempty, it\'s used as data in a delegate call to `_logic`. This will typically be an encoded function call, and allows initializating the storage of the proxy like a Solidity constructor."}},"version":1},"userdoc":{"kind":"user","methods":{},"version":1}},"settings":{"compilationTarget":{"@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol":"ERC1967Proxy"},"evmVersion":"istanbul","libraries":{},"metadata":{"bytecodeHash":"ipfs","useLiteralContent":true},"optimizer":{"enabled":false,"runs":200},"remappings":[]},"sources":{"@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol":{"content":"// SPDX-License-Identifier: MIT\\n// OpenZeppelin Contracts v4.4.1 (proxy/ERC1967/ERC1967Proxy.sol)\\n\\npragma solidity ^0.8.0;\\n\\nimport \\"../Proxy.sol\\";\\nimport \\"./ERC1967Upgrade.sol\\";\\n\\n/**\\n * @dev This contract implements an upgradeable proxy. It is upgradeable because calls are delegated to an\\n * implementation address that can be changed. This address is stored in storage in the location specified by\\n * https://eips.ethereum.org/EIPS/eip-1967[EIP1967], so that it doesn\'t conflict with the storage layout of the\\n * implementation behind the proxy.\\n */\\ncontract ERC1967Proxy is Proxy, ERC1967Upgrade {\\n    /**\\n     * @dev Initializes the upgradeable proxy with an initial implementation specified by `_logic`.\\n     *\\n     * If `_data` is nonempty, it\'s used as data in a delegate call to `_logic`. This will typically be an encoded\\n     * function call, and allows initializating the storage of the proxy like a Solidity constructor.\\n     */\\n    constructor(address _logic, bytes memory _data) payable {\\n        assert(_IMPLEMENTATION_SLOT == bytes32(uint256(keccak256(\\"eip1967.proxy.implementation\\")) - 1));\\n        _upgradeToAndCall(_logic, _data, false);\\n    }\\n\\n    /**\\n     * @dev Returns the current implementation address.\\n     */\\n    function _implementation() internal view virtual override returns (address impl) {\\n        return ERC1967Upgrade._getImplementation();\\n    }\\n}\\n","keccak256":"0x6309f9f39dc6f4f45a24f296543867aa358e32946cd6b2874627a996d606b3a0","license":"MIT"},"@openzeppelin/contracts/proxy/ERC1967/ERC1967Upgrade.sol":{"content":"// SPDX-License-Identifier: MIT\\n// OpenZeppelin Contracts v4.4.1 (proxy/ERC1967/ERC1967Upgrade.sol)\\n\\npragma solidity ^0.8.2;\\n\\nimport \\"../beacon/IBeacon.sol\\";\\nimport \\"../../utils/Address.sol\\";\\nimport \\"../../utils/StorageSlot.sol\\";\\n\\n/**\\n * @dev This abstract contract provides getters and event emitting update functions for\\n * https://eips.ethereum.org/EIPS/eip-1967[EIP1967] slots.\\n *\\n * _Available since v4.1._\\n *\\n * @custom:oz-upgrades-unsafe-allow delegatecall\\n */\\nabstract contract ERC1967Upgrade {\\n    // This is the keccak-256 hash of \\"eip1967.proxy.rollback\\" subtracted by 1\\n    bytes32 private constant _ROLLBACK_SLOT = 0x4910fdfa16fed3260ed0e7147f7cc6da11a60208b5b9406d12a635614ffd9143;\\n\\n    /**\\n     * @dev Storage slot with the address of the current implementation.\\n     * This is the keccak-256 hash of \\"eip1967.proxy.implementation\\" subtracted by 1, and is\\n     * validated in the constructor.\\n     */\\n    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;\\n\\n    /**\\n     * @dev Emitted when the implementation is upgraded.\\n     */\\n    event Upgraded(address indexed implementation);\\n\\n    /**\\n     * @dev Returns the current implementation address.\\n     */\\n    function _getImplementation() internal view returns (address) {\\n        return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;\\n    }\\n\\n    /**\\n     * @dev Stores a new address in the EIP1967 implementation slot.\\n     */\\n    function _setImplementation(address newImplementation) private {\\n        require(Address.isContract(newImplementation), \\"ERC1967: new implementation is not a contract\\");\\n        StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;\\n    }\\n\\n    /**\\n     * @dev Perform implementation upgrade\\n     *\\n     * Emits an {Upgraded} event.\\n     */\\n    function _upgradeTo(address newImplementation) internal {\\n        _setImplementation(newImplementation);\\n        emit Upgraded(newImplementation);\\n    }\\n\\n    /**\\n     * @dev Perform implementation upgrade with additional setup call.\\n     *\\n     * Emits an {Upgraded} event.\\n     */\\n    function _upgradeToAndCall(\\n        address newImplementation,\\n        bytes memory data,\\n        bool forceCall\\n    ) internal {\\n        _upgradeTo(newImplementation);\\n        if (data.length > 0 || forceCall) {\\n            Address.functionDelegateCall(newImplementation, data);\\n        }\\n    }\\n\\n    /**\\n     * @dev Perform implementation upgrade with security checks for UUPS proxies, and additional setup call.\\n     *\\n     * Emits an {Upgraded} event.\\n     */\\n    function _upgradeToAndCallSecure(\\n        address newImplementation,\\n        bytes memory data,\\n        bool forceCall\\n    ) internal {\\n        address oldImplementation = _getImplementation();\\n\\n        // Initial upgrade and setup call\\n        _setImplementation(newImplementation);\\n        if (data.length > 0 || forceCall) {\\n            Address.functionDelegateCall(newImplementation, data);\\n        }\\n\\n        // Perform rollback test if not already in progress\\n        StorageSlot.BooleanSlot storage rollbackTesting = StorageSlot.getBooleanSlot(_ROLLBACK_SLOT);\\n        if (!rollbackTesting.value) {\\n            // Trigger rollback using upgradeTo from the new implementation\\n            rollbackTesting.value = true;\\n            Address.functionDelegateCall(\\n                newImplementation,\\n                abi.encodeWithSignature(\\"upgradeTo(address)\\", oldImplementation)\\n            );\\n            rollbackTesting.value = false;\\n            // Check rollback was effective\\n            require(oldImplementation == _getImplementation(), \\"ERC1967Upgrade: upgrade breaks further upgrades\\");\\n            // Finally reset to the new implementation and log the upgrade\\n            _upgradeTo(newImplementation);\\n        }\\n    }\\n\\n    /**\\n     * @dev Storage slot with the admin of the contract.\\n     * This is the keccak-256 hash of \\"eip1967.proxy.admin\\" subtracted by 1, and is\\n     * validated in the constructor.\\n     */\\n    bytes32 internal constant _ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;\\n\\n    /**\\n     * @dev Emitted when the admin account has changed.\\n     */\\n    event AdminChanged(address previousAdmin, address newAdmin);\\n\\n    /**\\n     * @dev Returns the current admin.\\n     */\\n    function _getAdmin() internal view returns (address) {\\n        return StorageSlot.getAddressSlot(_ADMIN_SLOT).value;\\n    }\\n\\n    /**\\n     * @dev Stores a new address in the EIP1967 admin slot.\\n     */\\n    function _setAdmin(address newAdmin) private {\\n        require(newAdmin != address(0), \\"ERC1967: new admin is the zero address\\");\\n        StorageSlot.getAddressSlot(_ADMIN_SLOT).value = newAdmin;\\n    }\\n\\n    /**\\n     * @dev Changes the admin of the proxy.\\n     *\\n     * Emits an {AdminChanged} event.\\n     */\\n    function _changeAdmin(address newAdmin) internal {\\n        emit AdminChanged(_getAdmin(), newAdmin);\\n        _setAdmin(newAdmin);\\n    }\\n\\n    /**\\n     * @dev The storage slot of the UpgradeableBeacon contract which defines the implementation for this proxy.\\n     * This is bytes32(uint256(keccak256(\'eip1967.proxy.beacon\')) - 1)) and is validated in the constructor.\\n     */\\n    bytes32 internal constant _BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;\\n\\n    /**\\n     * @dev Emitted when the beacon is upgraded.\\n     */\\n    event BeaconUpgraded(address indexed beacon);\\n\\n    /**\\n     * @dev Returns the current beacon.\\n     */\\n    function _getBeacon() internal view returns (address) {\\n        return StorageSlot.getAddressSlot(_BEACON_SLOT).value;\\n    }\\n\\n    /**\\n     * @dev Stores a new beacon in the EIP1967 beacon slot.\\n     */\\n    function _setBeacon(address newBeacon) private {\\n        require(Address.isContract(newBeacon), \\"ERC1967: new beacon is not a contract\\");\\n        require(\\n            Address.isContract(IBeacon(newBeacon).implementation()),\\n            \\"ERC1967: beacon implementation is not a contract\\"\\n        );\\n        StorageSlot.getAddressSlot(_BEACON_SLOT).value = newBeacon;\\n    }\\n\\n    /**\\n     * @dev Perform beacon upgrade with additional setup call. Note: This upgrades the address of the beacon, it does\\n     * not upgrade the implementation contained in the beacon (see {UpgradeableBeacon-_setImplementation} for that).\\n     *\\n     * Emits a {BeaconUpgraded} event.\\n     */\\n    function _upgradeBeaconToAndCall(\\n        address newBeacon,\\n        bytes memory data,\\n        bool forceCall\\n    ) internal {\\n        _setBeacon(newBeacon);\\n        emit BeaconUpgraded(newBeacon);\\n        if (data.length > 0 || forceCall) {\\n            Address.functionDelegateCall(IBeacon(newBeacon).implementation(), data);\\n        }\\n    }\\n}\\n","keccak256":"0x5f4c3eed093dfb0e4e20c1c102d2f2c6894a972f454adb308511a0afb37e6f79","license":"MIT"},"@openzeppelin/contracts/proxy/Proxy.sol":{"content":"// SPDX-License-Identifier: MIT\\n// OpenZeppelin Contracts v4.4.1 (proxy/Proxy.sol)\\n\\npragma solidity ^0.8.0;\\n\\n/**\\n * @dev This abstract contract provides a fallback function that delegates all calls to another contract using the EVM\\n * instruction `delegatecall`. We refer to the second contract as the _implementation_ behind the proxy, and it has to\\n * be specified by overriding the virtual {_implementation} function.\\n *\\n * Additionally, delegation to the implementation can be triggered manually through the {_fallback} function, or to a\\n * different contract through the {_delegate} function.\\n *\\n * The success and return data of the delegated call will be returned back to the caller of the proxy.\\n */\\nabstract contract Proxy {\\n    /**\\n     * @dev Delegates the current call to `implementation`.\\n     *\\n     * This function does not return to its internall call site, it will return directly to the external caller.\\n     */\\n    function _delegate(address implementation) internal virtual {\\n        assembly {\\n            // Copy msg.data. We take full control of memory in this inline assembly\\n            // block because it will not return to Solidity code. We overwrite the\\n            // Solidity scratch pad at memory position 0.\\n            calldatacopy(0, 0, calldatasize())\\n\\n            // Call the implementation.\\n            // out and outsize are 0 because we don\'t know the size yet.\\n            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)\\n\\n            // Copy the returned data.\\n            returndatacopy(0, 0, returndatasize())\\n\\n            switch result\\n            // delegatecall returns 0 on error.\\n            case 0 {\\n                revert(0, returndatasize())\\n            }\\n            default {\\n                return(0, returndatasize())\\n            }\\n        }\\n    }\\n\\n    /**\\n     * @dev This is a virtual function that should be overriden so it returns the address to which the fallback function\\n     * and {_fallback} should delegate.\\n     */\\n    function _implementation() internal view virtual returns (address);\\n\\n    /**\\n     * @dev Delegates the current call to the address returned by `_implementation()`.\\n     *\\n     * This function does not return to its internall call site, it will return directly to the external caller.\\n     */\\n    function _fallback() internal virtual {\\n        _beforeFallback();\\n        _delegate(_implementation());\\n    }\\n\\n    /**\\n     * @dev Fallback function that delegates calls to the address returned by `_implementation()`. Will run if no other\\n     * function in the contract matches the call data.\\n     */\\n    fallback() external payable virtual {\\n        _fallback();\\n    }\\n\\n    /**\\n     * @dev Fallback function that delegates calls to the address returned by `_implementation()`. Will run if call data\\n     * is empty.\\n     */\\n    receive() external payable virtual {\\n        _fallback();\\n    }\\n\\n    /**\\n     * @dev Hook that is called before falling back to the implementation. Can happen as part of a manual `_fallback`\\n     * call, or as part of the Solidity `fallback` or `receive` functions.\\n     *\\n     * If overriden should call `super._beforeFallback()`.\\n     */\\n    function _beforeFallback() internal virtual {}\\n}\\n","keccak256":"0xab2556b154ceb1a11e456f2827ca8f6f65242b1b2fcc00268ab6d38fc6e64bbd","license":"MIT"},"@openzeppelin/contracts/proxy/beacon/IBeacon.sol":{"content":"// SPDX-License-Identifier: MIT\\n// OpenZeppelin Contracts v4.4.1 (proxy/beacon/IBeacon.sol)\\n\\npragma solidity ^0.8.0;\\n\\n/**\\n * @dev This is the interface that {BeaconProxy} expects of its beacon.\\n */\\ninterface IBeacon {\\n    /**\\n     * @dev Must return an address that can be used as a delegate call target.\\n     *\\n     * {BeaconProxy} will check that this address is a contract.\\n     */\\n    function implementation() external view returns (address);\\n}\\n","keccak256":"0xd50a3421ac379ccb1be435fa646d66a65c986b4924f0849839f08692f39dde61","license":"MIT"},"@openzeppelin/contracts/utils/Address.sol":{"content":"// SPDX-License-Identifier: MIT\\n// OpenZeppelin Contracts v4.4.1 (utils/Address.sol)\\n\\npragma solidity ^0.8.0;\\n\\n/**\\n * @dev Collection of functions related to the address type\\n */\\nlibrary Address {\\n    /**\\n     * @dev Returns true if `account` is a contract.\\n     *\\n     * [IMPORTANT]\\n     * ====\\n     * It is unsafe to assume that an address for which this function returns\\n     * false is an externally-owned account (EOA) and not a contract.\\n     *\\n     * Among others, `isContract` will return false for the following\\n     * types of addresses:\\n     *\\n     *  - an externally-owned account\\n     *  - a contract in construction\\n     *  - an address where a contract will be created\\n     *  - an address where a contract lived, but was destroyed\\n     * ====\\n     */\\n    function isContract(address account) internal view returns (bool) {\\n        // This method relies on extcodesize, which returns 0 for contracts in\\n        // construction, since the code is only stored at the end of the\\n        // constructor execution.\\n\\n        uint256 size;\\n        assembly {\\n            size := extcodesize(account)\\n        }\\n        return size > 0;\\n    }\\n\\n    /**\\n     * @dev Replacement for Solidity\'s `transfer`: sends `amount` wei to\\n     * `recipient`, forwarding all available gas and reverting on errors.\\n     *\\n     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost\\n     * of certain opcodes, possibly making contracts go over the 2300 gas limit\\n     * imposed by `transfer`, making them unable to receive funds via\\n     * `transfer`. {sendValue} removes this limitation.\\n     *\\n     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].\\n     *\\n     * IMPORTANT: because control is transferred to `recipient`, care must be\\n     * taken to not create reentrancy vulnerabilities. Consider using\\n     * {ReentrancyGuard} or the\\n     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].\\n     */\\n    function sendValue(address payable recipient, uint256 amount) internal {\\n        require(address(this).balance >= amount, \\"Address: insufficient balance\\");\\n\\n        (bool success, ) = recipient.call{value: amount}(\\"\\");\\n        require(success, \\"Address: unable to send value, recipient may have reverted\\");\\n    }\\n\\n    /**\\n     * @dev Performs a Solidity function call using a low level `call`. A\\n     * plain `call` is an unsafe replacement for a function call: use this\\n     * function instead.\\n     *\\n     * If `target` reverts with a revert reason, it is bubbled up by this\\n     * function (like regular Solidity function calls).\\n     *\\n     * Returns the raw returned data. To convert to the expected return value,\\n     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].\\n     *\\n     * Requirements:\\n     *\\n     * - `target` must be a contract.\\n     * - calling `target` with `data` must not revert.\\n     *\\n     * _Available since v3.1._\\n     */\\n    function functionCall(address target, bytes memory data) internal returns (bytes memory) {\\n        return functionCall(target, data, \\"Address: low-level call failed\\");\\n    }\\n\\n    /**\\n     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with\\n     * `errorMessage` as a fallback revert reason when `target` reverts.\\n     *\\n     * _Available since v3.1._\\n     */\\n    function functionCall(\\n        address target,\\n        bytes memory data,\\n        string memory errorMessage\\n    ) internal returns (bytes memory) {\\n        return functionCallWithValue(target, data, 0, errorMessage);\\n    }\\n\\n    /**\\n     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],\\n     * but also transferring `value` wei to `target`.\\n     *\\n     * Requirements:\\n     *\\n     * - the calling contract must have an ETH balance of at least `value`.\\n     * - the called Solidity function must be `payable`.\\n     *\\n     * _Available since v3.1._\\n     */\\n    function functionCallWithValue(\\n        address target,\\n        bytes memory data,\\n        uint256 value\\n    ) internal returns (bytes memory) {\\n        return functionCallWithValue(target, data, value, \\"Address: low-level call with value failed\\");\\n    }\\n\\n    /**\\n     * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but\\n     * with `errorMessage` as a fallback revert reason when `target` reverts.\\n     *\\n     * _Available since v3.1._\\n     */\\n    function functionCallWithValue(\\n        address target,\\n        bytes memory data,\\n        uint256 value,\\n        string memory errorMessage\\n    ) internal returns (bytes memory) {\\n        require(address(this).balance >= value, \\"Address: insufficient balance for call\\");\\n        require(isContract(target), \\"Address: call to non-contract\\");\\n\\n        (bool success, bytes memory returndata) = target.call{value: value}(data);\\n        return verifyCallResult(success, returndata, errorMessage);\\n    }\\n\\n    /**\\n     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],\\n     * but performing a static call.\\n     *\\n     * _Available since v3.3._\\n     */\\n    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {\\n        return functionStaticCall(target, data, \\"Address: low-level static call failed\\");\\n    }\\n\\n    /**\\n     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],\\n     * but performing a static call.\\n     *\\n     * _Available since v3.3._\\n     */\\n    function functionStaticCall(\\n        address target,\\n        bytes memory data,\\n        string memory errorMessage\\n    ) internal view returns (bytes memory) {\\n        require(isContract(target), \\"Address: static call to non-contract\\");\\n\\n        (bool success, bytes memory returndata) = target.staticcall(data);\\n        return verifyCallResult(success, returndata, errorMessage);\\n    }\\n\\n    /**\\n     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],\\n     * but performing a delegate call.\\n     *\\n     * _Available since v3.4._\\n     */\\n    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {\\n        return functionDelegateCall(target, data, \\"Address: low-level delegate call failed\\");\\n    }\\n\\n    /**\\n     * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],\\n     * but performing a delegate call.\\n     *\\n     * _Available since v3.4._\\n     */\\n    function functionDelegateCall(\\n        address target,\\n        bytes memory data,\\n        string memory errorMessage\\n    ) internal returns (bytes memory) {\\n        require(isContract(target), \\"Address: delegate call to non-contract\\");\\n\\n        (bool success, bytes memory returndata) = target.delegatecall(data);\\n        return verifyCallResult(success, returndata, errorMessage);\\n    }\\n\\n    /**\\n     * @dev Tool to verifies that a low level call was successful, and revert if it wasn\'t, either by bubbling the\\n     * revert reason using the provided one.\\n     *\\n     * _Available since v4.3._\\n     */\\n    function verifyCallResult(\\n        bool success,\\n        bytes memory returndata,\\n        string memory errorMessage\\n    ) internal pure returns (bytes memory) {\\n        if (success) {\\n            return returndata;\\n        } else {\\n            // Look for revert reason and bubble it up if present\\n            if (returndata.length > 0) {\\n                // The easiest way to bubble the revert reason is using memory via assembly\\n\\n                assembly {\\n                    let returndata_size := mload(returndata)\\n                    revert(add(32, returndata), returndata_size)\\n                }\\n            } else {\\n                revert(errorMessage);\\n            }\\n        }\\n    }\\n}\\n","keccak256":"0x51b758a8815ecc9596c66c37d56b1d33883a444631a3f916b9fe65cb863ef7c4","license":"MIT"},"@openzeppelin/contracts/utils/StorageSlot.sol":{"content":"// SPDX-License-Identifier: MIT\\n// OpenZeppelin Contracts v4.4.1 (utils/StorageSlot.sol)\\n\\npragma solidity ^0.8.0;\\n\\n/**\\n * @dev Library for reading and writing primitive types to specific storage slots.\\n *\\n * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.\\n * This library helps with reading and writing to such slots without the need for inline assembly.\\n *\\n * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.\\n *\\n * Example usage to set ERC1967 implementation slot:\\n * ```\\n * contract ERC1967 {\\n *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;\\n *\\n *     function _getImplementation() internal view returns (address) {\\n *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;\\n *     }\\n *\\n *     function _setImplementation(address newImplementation) internal {\\n *         require(Address.isContract(newImplementation), \\"ERC1967: new implementation is not a contract\\");\\n *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;\\n *     }\\n * }\\n * ```\\n *\\n * _Available since v4.1 for `address`, `bool`, `bytes32`, and `uint256`._\\n */\\nlibrary StorageSlot {\\n    struct AddressSlot {\\n        address value;\\n    }\\n\\n    struct BooleanSlot {\\n        bool value;\\n    }\\n\\n    struct Bytes32Slot {\\n        bytes32 value;\\n    }\\n\\n    struct Uint256Slot {\\n        uint256 value;\\n    }\\n\\n    /**\\n     * @dev Returns an `AddressSlot` with member `value` located at `slot`.\\n     */\\n    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {\\n        assembly {\\n            r.slot := slot\\n        }\\n    }\\n\\n    /**\\n     * @dev Returns an `BooleanSlot` with member `value` located at `slot`.\\n     */\\n    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {\\n        assembly {\\n            r.slot := slot\\n        }\\n    }\\n\\n    /**\\n     * @dev Returns an `Bytes32Slot` with member `value` located at `slot`.\\n     */\\n    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {\\n        assembly {\\n            r.slot := slot\\n        }\\n    }\\n\\n    /**\\n     * @dev Returns an `Uint256Slot` with member `value` located at `slot`.\\n     */\\n    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {\\n        assembly {\\n            r.slot := slot\\n        }\\n    }\\n}\\n","keccak256":"0xfe1b7a9aa2a530a9e705b220e26cd584e2fbdc9602a3a1066032b12816b46aca","license":"MIT"}},"version":1}',
  bytecode:
    '0x608060405260405162000d6638038062000d668339818101604052810190620000299190620005c4565b60017f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbd60001c6200005b919062000663565b60001b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc60001b146200009357620000926200069e565b5b620000a782826000620000af60201b60201c565b5050620008e4565b620000c083620000f260201b60201c565b600082511180620000ce5750805b15620000ed57620000eb83836200014960201b620000371760201c565b505b505050565b62000103816200017f60201b60201c565b8073ffffffffffffffffffffffffffffffffffffffff167fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b60405160405180910390a250565b606062000177838360405180606001604052806027815260200162000d3f602791396200025560201b60201c565b905092915050565b62000195816200033960201b620000641760201c565b620001d7576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401620001ce9062000754565b60405180910390fd5b80620002117f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc60001b6200034c60201b620000771760201c565b60000160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b606062000268846200033960201b60201c565b620002aa576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401620002a190620007ec565b60405180910390fd5b6000808573ffffffffffffffffffffffffffffffffffffffff1685604051620002d491906200085b565b600060405180830381855af49150503d806000811462000311576040519150601f19603f3d011682016040523d82523d6000602084013e62000316565b606091505b50915091506200032e8282866200035660201b60201c565b925050509392505050565b600080823b905060008111915050919050565b6000819050919050565b606083156200036857829050620003bb565b6000835111156200037c5782518084602001fd5b816040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401620003b29190620008c0565b60405180910390fd5b9392505050565b6000604051905090565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006200040382620003d6565b9050919050565b6200041581620003f6565b81146200042157600080fd5b50565b60008151905062000435816200040a565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b620004908262000445565b810181811067ffffffffffffffff82111715620004b257620004b162000456565b5b80604052505050565b6000620004c7620003c2565b9050620004d5828262000485565b919050565b600067ffffffffffffffff821115620004f857620004f762000456565b5b620005038262000445565b9050602081019050919050565b60005b838110156200053057808201518184015260208101905062000513565b8381111562000540576000848401525b50505050565b60006200055d6200055784620004da565b620004bb565b9050828152602081018484840111156200057c576200057b62000440565b5b6200058984828562000510565b509392505050565b600082601f830112620005a957620005a86200043b565b5b8151620005bb84826020860162000546565b91505092915050565b60008060408385031215620005de57620005dd620003cc565b5b6000620005ee8582860162000424565b925050602083015167ffffffffffffffff811115620006125762000611620003d1565b5b620006208582860162000591565b9150509250929050565b6000819050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b600062000670826200062a565b91506200067d836200062a565b92508282101562000693576200069262000634565b5b828203905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052600160045260246000fd5b600082825260208201905092915050565b7f455243313936373a206e657720696d706c656d656e746174696f6e206973206e60008201527f6f74206120636f6e747261637400000000000000000000000000000000000000602082015250565b60006200073c602d83620006cd565b91506200074982620006de565b604082019050919050565b600060208201905081810360008301526200076f816200072d565b9050919050565b7f416464726573733a2064656c65676174652063616c6c20746f206e6f6e2d636f60008201527f6e74726163740000000000000000000000000000000000000000000000000000602082015250565b6000620007d4602683620006cd565b9150620007e18262000776565b604082019050919050565b600060208201905081810360008301526200080781620007c5565b9050919050565b600081519050919050565b600081905092915050565b600062000831826200080e565b6200083d818562000819565b93506200084f81856020860162000510565b80840191505092915050565b600062000869828462000824565b915081905092915050565b600081519050919050565b60006200088c8262000874565b620008988185620006cd565b9350620008aa81856020860162000510565b620008b58162000445565b840191505092915050565b60006020820190508181036000830152620008dc81846200087f565b905092915050565b61044b80620008f46000396000f3fe6080604052366100135761001161001d565b005b61001b61001d565b005b610025610081565b610035610030610083565b610092565b565b606061005c83836040518060600160405280602781526020016103ef602791396100b8565b905092915050565b600080823b905060008111915050919050565b6000819050919050565b565b600061008d610185565b905090565b3660008037600080366000845af43d6000803e80600081146100b3573d6000f35b3d6000fd5b60606100c384610064565b610102576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100f9906102c6565b60405180910390fd5b6000808573ffffffffffffffffffffffffffffffffffffffff168560405161012a9190610360565b600060405180830381855af49150503d8060008114610165576040519150601f19603f3d011682016040523d82523d6000602084013e61016a565b606091505b509150915061017a8282866101dc565b925050509392505050565b60006101b37f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc60001b610077565b60000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b606083156101ec5782905061023c565b6000835111156101ff5782518084602001fd5b816040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161023391906103cc565b60405180910390fd5b9392505050565b600082825260208201905092915050565b7f416464726573733a2064656c65676174652063616c6c20746f206e6f6e2d636f60008201527f6e74726163740000000000000000000000000000000000000000000000000000602082015250565b60006102b0602683610243565b91506102bb82610254565b604082019050919050565b600060208201905081810360008301526102df816102a3565b9050919050565b600081519050919050565b600081905092915050565b60005b8381101561031a5780820151818401526020810190506102ff565b83811115610329576000848401525b50505050565b600061033a826102e6565b61034481856102f1565b93506103548185602086016102fc565b80840191505092915050565b600061036c828461032f565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b600061039e82610377565b6103a88185610243565b93506103b88185602086016102fc565b6103c181610382565b840191505092915050565b600060208201905081810360008301526103e68184610393565b90509291505056fe416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c206661696c6564a26469706673582212209457a4363b8ceefcc071a165d644195592736cc3d4aa4dea601cf19529a7e0fa64736f6c634300080b0033416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c206661696c6564',
  deployedBytecode:
    '0x6080604052366100135761001161001d565b005b61001b61001d565b005b610025610081565b610035610030610083565b610092565b565b606061005c83836040518060600160405280602781526020016103ef602791396100b8565b905092915050565b600080823b905060008111915050919050565b6000819050919050565b565b600061008d610185565b905090565b3660008037600080366000845af43d6000803e80600081146100b3573d6000f35b3d6000fd5b60606100c384610064565b610102576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100f9906102c6565b60405180910390fd5b6000808573ffffffffffffffffffffffffffffffffffffffff168560405161012a9190610360565b600060405180830381855af49150503d8060008114610165576040519150601f19603f3d011682016040523d82523d6000602084013e61016a565b606091505b509150915061017a8282866101dc565b925050509392505050565b60006101b37f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc60001b610077565b60000160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b606083156101ec5782905061023c565b6000835111156101ff5782518084602001fd5b816040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161023391906103cc565b60405180910390fd5b9392505050565b600082825260208201905092915050565b7f416464726573733a2064656c65676174652063616c6c20746f206e6f6e2d636f60008201527f6e74726163740000000000000000000000000000000000000000000000000000602082015250565b60006102b0602683610243565b91506102bb82610254565b604082019050919050565b600060208201905081810360008301526102df816102a3565b9050919050565b600081519050919050565b600081905092915050565b60005b8381101561031a5780820151818401526020810190506102ff565b83811115610329576000848401525b50505050565b600061033a826102e6565b61034481856102f1565b93506103548185602086016102fc565b80840191505092915050565b600061036c828461032f565b915081905092915050565b600081519050919050565b6000601f19601f8301169050919050565b600061039e82610377565b6103a88185610243565b93506103b88185602086016102fc565b6103c181610382565b840191505092915050565b600060208201905081810360008301526103e68184610393565b90509291505056fe416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c206661696c6564a26469706673582212209457a4363b8ceefcc071a165d644195592736cc3d4aa4dea601cf19529a7e0fa64736f6c634300080b0033',
  implementation: '0xD718B64bc1FACbd0087D827c0a3EA144445F5745',
  devdoc: {
    details:
      "This contract implements an upgradeable proxy. It is upgradeable because calls are delegated to an implementation address that can be changed. This address is stored in storage in the location specified by https://eips.ethereum.org/EIPS/eip-1967[EIP1967], so that it doesn't conflict with the storage layout of the implementation behind the proxy.",
    kind: 'dev',
    methods: {
      constructor: {
        details:
          "Initializes the upgradeable proxy with an initial implementation specified by `_logic`. If `_data` is nonempty, it's used as data in a delegate call to `_logic`. This will typically be an encoded function call, and allows initializating the storage of the proxy like a Solidity constructor.",
      },
    },
    version: 1,
  },
  userdoc: {
    kind: 'user',
    methods: {},
    version: 1,
  },
  storageLayout: {
    storage: [],
    types: null,
  },
} as const;
