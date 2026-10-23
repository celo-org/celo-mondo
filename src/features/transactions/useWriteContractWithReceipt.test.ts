import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { WALLET_CONNECT_CONNECTOR_ID } from 'src/config/consts';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { TEST_ADDRESSES } from 'src/test/anvil/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as wagmi from 'wagmi';

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
}));

const tx = {
  address: TEST_ADDRESSES[0],
  abi: [{ type: 'function', name: 'noop', inputs: [], outputs: [], stateMutability: 'nonpayable' }],
  functionName: 'noop',
} as any;

function setup({
  estimateGas = vi.fn(async () => 100n),
  prepareTransactionRequest = vi.fn(async () => ({ maxFeePerGas: 7n, maxPriorityFeePerGas: 1n })),
  connectorId = 'injected',
} = {}) {
  const mutate = vi.fn();
  vi.spyOn(wagmi, 'useConnection').mockReturnValue({
    address: TEST_ADDRESSES[0],
    connector: { id: connectorId },
  } as any);
  vi.spyOn(wagmi, 'usePublicClient').mockReturnValue({
    estimateGas,
    prepareTransactionRequest,
  } as any);
  vi.spyOn(wagmi, 'useWriteContract').mockReturnValue({ mutate, isPending: false } as any);
  vi.spyOn(wagmi, 'useWaitForTransactionReceipt').mockReturnValue({
    isLoading: false,
    isSuccess: false,
  } as any);
  return { mutate, estimateGas };
}

describe('useWriteContractWithReceipt', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports loading while the gas estimate is still being prepared', async () => {
    let release!: (gas: bigint) => void;
    const { mutate } = setup({
      estimateGas: vi.fn(() => new Promise<bigint>((resolve) => (release = resolve))),
    });
    const { result } = renderHook(() => useWriteContractWithReceipt('test'));
    expect(result.current.isLoading).toBe(false);

    let write: Promise<void>;
    act(() => {
      write = result.current.writeContract(tx);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(mutate).not.toHaveBeenCalled();

    await act(async () => {
      release(100n);
      await write;
    });
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ gas: 130n }));
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores a second call while the first is still preparing', async () => {
    let release!: (gas: bigint) => void;
    const { mutate, estimateGas } = setup({
      estimateGas: vi.fn(() => new Promise<bigint>((resolve) => (release = resolve))),
    });
    const { result } = renderHook(() => useWriteContractWithReceipt('test'));

    let first: Promise<void>;
    await act(async () => {
      first = result.current.writeContract(tx);
      await result.current.writeContract(tx);
    });
    expect(estimateGas).toHaveBeenCalledTimes(1);

    await act(async () => {
      release(100n);
      await first;
    });
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('toasts and stops loading when the estimate rejects', async () => {
    const error = vi.spyOn(toast, 'error').mockReturnValue('' as any);
    const { mutate } = setup({
      estimateGas: vi.fn(async () => Promise.reject(new Error('revert'))),
    });
    const { result } = renderHook(() => useWriteContractWithReceipt('test'));

    await act(() => result.current.writeContract(tx));

    expect(mutate).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Error preparing test transaction'));
    expect(result.current.isLoading).toBe(false);
  });

  it('populates fees for WalletConnect wallets and toasts if that preparation fails', async () => {
    const { mutate } = setup({ connectorId: WALLET_CONNECT_CONNECTOR_ID });
    const { result } = renderHook(() => useWriteContractWithReceipt('test'));
    await act(() => result.current.writeContract(tx));
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ gas: 130n, maxFeePerGas: 7n, maxPriorityFeePerGas: 1n }),
    );

    vi.restoreAllMocks();
    const error = vi.spyOn(toast, 'error').mockReturnValue('' as any);
    const failing = setup({
      connectorId: WALLET_CONNECT_CONNECTOR_ID,
      prepareTransactionRequest: vi.fn(async () => Promise.reject(new Error('nope'))),
    });
    const second = renderHook(() => useWriteContractWithReceipt('test'));
    await act(() => second.result.current.writeContract(tx));
    expect(failing.mutate).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    expect(second.result.current.isLoading).toBe(false);
  });
});
