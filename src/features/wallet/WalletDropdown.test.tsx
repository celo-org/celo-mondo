import { render } from '@testing-library/react';
import { TEST_ADDRESSES } from 'src/test/anvil/constants';
import * as useTrackEventModule from 'src/utils/useTrackEvent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as wagmi from 'wagmi';
import { WalletDropdown } from './WalletDropdown';

vi.mock('wagmi', async (importActual) => ({
  ...(await importActual()),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: () => ({ openConnectModal: vi.fn() }),
}));

vi.mock('src/features/account/hooks', () => ({
  useBalance: () => ({ balance: 0n }),
  useLockedBalance: () => ({ lockedBalance: 0n }),
  useVoteSignerToAccount: () => ({ signingFor: TEST_ADDRESSES[0], isVoteSigner: false }),
}));

vi.mock('src/features/governance/hooks/useVotingStatus', () => ({
  useGovernanceVotingPower: () => ({ votingPower: 0n }),
}));

vi.mock('src/features/staking/rewards/useStakingRewards', () => ({
  useStakingRewards: () => ({ totalRewards: 0 }),
}));

vi.mock('src/features/staking/useStakingBalances', () => ({
  useStakingBalances: () => ({ groupToStake: {} }),
}));

vi.mock('src/utils/useAddressToLabel', () => ({
  useAddressToLabel: () => () => ({
    label: 'test label',
    address: '0x123456',
    fallback: '0x123...456',
    isCeloName: false,
  }),
}));

vi.mock('src/utils/clipboard', () => ({
  useCopyHandler: () => vi.fn(),
}));

describe('<WalletDropdown />', () => {
  let mockTrackEvent: any;

  beforeEach(() => {
    mockTrackEvent = vi.fn();
    vi.spyOn(useTrackEventModule, 'useTrackEvent').mockReturnValue(mockTrackEvent);
    vi.spyOn(wagmi, 'useDisconnect').mockReturnValue({
      disconnectAsync: vi.fn(),
    } as any);
    vi.spyOn(wagmi, 'useConnect').mockReturnValue({
      connect: vi.fn(),
      connectors: [],
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('tracks wallet_connected event when wallet becomes connected', () => {
    const mockUseAccount = vi.spyOn(wagmi, 'useAccount');
    mockUseAccount.mockReturnValue({
      isConnected: false,
      address: undefined,
      connector: undefined,
    } as any);

    const { rerender } = render(<WalletDropdown />);

    expect(mockTrackEvent).not.toHaveBeenCalledWith('wallet_connected', expect.any(Object));

    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: TEST_ADDRESSES[0],
      connector: { name: 'MetaMask' },
    } as any);

    rerender(<WalletDropdown />);

    expect(mockTrackEvent).toHaveBeenCalledWith('wallet_connected', {
      walletType: 'MetaMask',
    });
  });

  it('does not track wallet_connected if already connected on initial render', () => {
    vi.spyOn(wagmi, 'useAccount').mockReturnValue({
      isConnected: true,
      address: TEST_ADDRESSES[0],
      connector: { name: 'MetaMask' },
    } as any);

    render(<WalletDropdown />);

    expect(mockTrackEvent).not.toHaveBeenCalledWith('wallet_connected', expect.any(Object));
  });

  it('does not track wallet_connected if connected but no address', () => {
    const mockUseAccount = vi.spyOn(wagmi, 'useAccount');
    mockUseAccount.mockReturnValue({
      isConnected: false,
      address: undefined,
      connector: { name: 'MetaMask' },
    } as any);

    const { rerender } = render(<WalletDropdown />);

    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: undefined,
      connector: { name: 'MetaMask' },
    } as any);

    rerender(<WalletDropdown />);

    expect(mockTrackEvent).not.toHaveBeenCalledWith('wallet_connected', expect.any(Object));
  });
});
