import { governanceABI } from '@celo/abis';
import { fetchMultiSigEvents } from 'src/app/governance/multisigEvents';
import { Addresses } from 'src/config/contracts';
import database from 'src/config/database';
import updateApprovalsInDB from 'src/features/governance/updateApprovalsInDB';
import { Address, encodeFunctionData } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the database
vi.mock('src/config/database', () => ({
  default: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue({ count: 0 }),
    delete: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the fetchMultiSigEvents function
vi.mock('src/app/governance/multisigEvents', () => ({
  fetchMultiSigEvents: vi.fn(),
}));

// Mock the revalidateTag function
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

describe('updateApprovalsInDB', () => {
  const mockClient = {
    chain: { id: 42220 },
    readContract: vi.fn(),
    getBlock: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch the approver multisig address from governance contract', async () => {
    const mockMultisigAddress = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;

    mockClient.readContract.mockResolvedValueOnce(mockMultisigAddress);

    // Mock empty events for both Confirmation and Revocation
    vi.mocked(fetchMultiSigEvents).mockResolvedValue([]);

    await updateApprovalsInDB(mockClient as any);

    expect(mockClient.readContract).toHaveBeenCalledWith({
      address: Addresses.Governance,
      abi: governanceABI,
      functionName: 'approver',
      args: [],
    });
  });

  it('should process Confirmation events and insert approvals', async () => {
    const mockMultisigAddress = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;
    const proposalId = 100n;
    const dequeueIndex = 0n;
    const approver = '0x1234567890123456789012345678901234567890' as Address;
    const multisigTxId = 5n;

    // Mock Confirmation event
    const mockConfirmationEvent = {
      chainId: 42220,
      eventName: 'Confirmation' as const,
      args: {
        sender: approver,
        transactionId: multisigTxId,
      },
      address: mockMultisigAddress.toLowerCase(),
      blockNumber: 12345678n,
      transactionHash: '0xabcdef' as `0x${string}`,
      topics: ['0x' as `0x${string}`],
      data: '0x' as `0x${string}`,
    };

    // Mock approver multisig address
    mockClient.readContract
      .mockResolvedValueOnce(mockMultisigAddress)
      // Mock multisig transaction details
      .mockResolvedValueOnce([
        Addresses.Governance, // destination
        0n, // value
        encodeFunctionData({
          abi: governanceABI,
          functionName: 'approve',
          args: [proposalId, dequeueIndex],
        }), // data
        false, // executed
      ]);

    // Mock block timestamp
    mockClient.getBlock.mockResolvedValue({ timestamp: 1234567890n });

    // Mock fetchMultiSigEvents to return Confirmation event, then empty for Revocation
    vi.mocked(fetchMultiSigEvents)
      .mockResolvedValueOnce([mockConfirmationEvent])
      .mockResolvedValueOnce([]);

    await updateApprovalsInDB(mockClient as any);

    // Verify that insert was called with correct data (rows are inserted individually now)
    expect(database.insert).toHaveBeenCalled();
    expect(database.values).toHaveBeenCalledWith({
      chainId: 42220,
      proposalId: Number(proposalId),
      multisigTxId: Number(multisigTxId),
      approver,
      confirmedAt: 1234567890,
      blockNumber: 12345678n,
      transactionHash: '0xabcdef',
    });
  });

  it('should skip non-approval function calls', async () => {
    const mockMultisigAddress = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;
    const approver = '0x1234567890123456789012345678901234567890' as Address;
    const multisigTxId = 5n;
    const proposalId = 100n;
    const dequeueIndex = 0n;

    // Mock Confirmation event
    const mockConfirmationEvent = {
      chainId: 42220,
      eventName: 'Confirmation' as const,
      args: {
        sender: approver,
        transactionId: multisigTxId,
      },
      address: mockMultisigAddress.toLowerCase(),
      blockNumber: 12345678n,
      transactionHash: '0xabcdef' as `0x${string}`,
      topics: ['0x' as `0x${string}`],
      data: '0x' as `0x${string}`,
    };

    // Mock approver multisig address
    mockClient.readContract
      .mockResolvedValueOnce(mockMultisigAddress)
      // Mock multisig transaction with "execute" function instead of "approve"
      .mockResolvedValueOnce([
        Addresses.Governance, // governance destination (correct)
        0n,
        encodeFunctionData({
          abi: governanceABI,
          functionName: 'execute', // non-approval function
          args: [proposalId, dequeueIndex],
        }),
        false,
      ]);

    // Mock fetchMultiSigEvents to return Confirmation event, then empty for Revocation
    vi.mocked(fetchMultiSigEvents)
      .mockResolvedValueOnce([mockConfirmationEvent])
      .mockResolvedValueOnce([]);

    const consoleLogSpy = vi.spyOn(console, 'log');

    await updateApprovalsInDB(mockClient as any);

    // Should log that we're skipping this transaction (not an approve call)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('not an approve call'));
    // Should NOT insert into database
    expect(database.insert).not.toHaveBeenCalled();
  });

  it('should handle Revocation events and delete approvals', async () => {
    const mockMultisigAddress = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;
    const approver = '0x1234567890123456789012345678901234567890' as Address;
    const multisigTxId = 5n;
    const proposalId = 100;

    // Mock Revocation event
    const mockRevocationEvent = {
      chainId: 42220,
      eventName: 'Revocation' as const,
      args: {
        sender: approver,
        transactionId: multisigTxId,
      },
      address: mockMultisigAddress.toLowerCase(),
      blockNumber: 12345678n,
      transactionHash: '0xabcdef' as `0x${string}`,
      topics: ['0x' as `0x${string}`],
      data: '0x' as `0x${string}`,
    };

    // Mock existing approval in database
    const mockExistingApproval = {
      chainId: 42220,
      proposalId,
      multisigTxId: Number(multisigTxId),
      approver,
      confirmedAt: 1234567890,
      blockNumber: 12345678n,
      transactionHash: '0xabcdef',
    };

    // Mock approver multisig address
    mockClient.readContract.mockResolvedValueOnce(mockMultisigAddress);

    // Mock fetchMultiSigEvents to return empty for Confirmation, then Revocation event
    vi.mocked(fetchMultiSigEvents)
      .mockResolvedValueOnce([]) // Confirmation events
      .mockResolvedValueOnce([mockRevocationEvent]); // Revocation events

    // Mock database query for existing approval
    vi.mocked(database.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockExistingApproval]),
    } as any);

    await updateApprovalsInDB(mockClient as any);

    // Verify that delete was called
    expect(database.delete).toHaveBeenCalled();
  });
});
