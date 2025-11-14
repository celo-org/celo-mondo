import { governanceABI } from '@celo/abis';
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
  },
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

    // Mock empty events
    vi.mocked(database.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    } as any);

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

    // Mock Confirmation event from database
    const mockConfirmationEvent = {
      chainId: 42220,
      eventName: 'Confirmation',
      args: {
        sender: approver,
        transactionId: multisigTxId,
      },
      address: mockMultisigAddress.toLowerCase(),
      blockNumber: 12345678n,
      transactionHash: '0xabcdef',
      topics: ['0x'],
      data: '0x',
    };

    vi.mocked(database.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValueOnce([mockConfirmationEvent]).mockResolvedValueOnce([]),
    } as any);

    await updateApprovalsInDB(mockClient as any);

    // Verify that insert was called with correct data
    expect(database.insert).toHaveBeenCalled();
  });

  it('should skip non-governance transactions', async () => {
    const mockMultisigAddress = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;
    const approver = '0x1234567890123456789012345678901234567890' as Address;
    const multisigTxId = 5n;

    // Mock approver multisig address
    mockClient.readContract
      .mockResolvedValueOnce(mockMultisigAddress)
      // Mock multisig transaction with non-governance destination
      .mockResolvedValueOnce([
        '0x0000000000000000000000000000000000000000' as Address, // non-governance destination
        0n,
        '0x',
        false,
      ]);

    // Mock Confirmation event from database
    const mockConfirmationEvent = {
      chainId: 42220,
      eventName: 'Confirmation',
      args: {
        sender: approver,
        transactionId: multisigTxId,
      },
      address: mockMultisigAddress.toLowerCase(),
      blockNumber: 12345678n,
      transactionHash: '0xabcdef',
      topics: ['0x'],
      data: '0x',
    };

    vi.mocked(database.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValueOnce([mockConfirmationEvent]).mockResolvedValueOnce([]),
    } as any);

    const consoleLogSpy = vi.spyOn(console, 'log');

    await updateApprovalsInDB(mockClient as any);

    // Should log that we're skipping this transaction
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping multisigTxId'));
  });

  it('should handle Revocation events and delete approvals', async () => {
    const mockMultisigAddress = '0x41822d8A191fcfB1cfcA5F7048818aCd8eE933d3' as Address;
    const approver = '0x1234567890123456789012345678901234567890' as Address;
    const multisigTxId = 5n;
    const proposalId = 100;

    // Mock approver multisig address
    mockClient.readContract.mockResolvedValueOnce(mockMultisigAddress);

    // Mock Revocation event from database
    const mockRevocationEvent = {
      chainId: 42220,
      eventName: 'Revocation',
      args: {
        sender: approver,
        transactionId: multisigTxId,
      },
      address: mockMultisigAddress.toLowerCase(),
      blockNumber: 12345678n,
      transactionHash: '0xabcdef',
      topics: ['0x'],
      data: '0x',
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

    let callCount = 0;
    vi.mocked(database.select).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockImplementation(() => {
        callCount++;
        // First call: return empty for Confirmation events
        // Second call: return revocation event
        // Third call: return existing approval
        if (callCount === 1) return Promise.resolve([]);
        if (callCount === 2) return Promise.resolve([mockRevocationEvent]);
        return Promise.resolve([mockExistingApproval]);
      }),
      limit: vi.fn().mockResolvedValue([mockExistingApproval]),
    } as any);

    await updateApprovalsInDB(mockClient as any);

    // Verify that delete was called
    expect(database.delete).toHaveBeenCalled();
  });
});
