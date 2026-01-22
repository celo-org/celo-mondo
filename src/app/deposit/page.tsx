'use client';

import { DaimoPayButton, useDaimoPayUI } from '@daimo/pay';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { shortenAddress } from 'src/utils/addresses';
import { getAddress } from 'viem';
import { celo } from 'viem/chains';
import { useAccount } from 'wagmi';

const DAIMO_APP_ID = process.env.NEXT_PUBLIC_DAIMO_PAY_APP_ID || 'pay-demo';

// Supported tokens on Celo - addresses from @daimo/pay-common
const SUPPORTED_TOKENS = [
  {
    id: 'CELO',
    name: 'CELO',
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438', // Wrapped CELO token
    description: 'Native Celo token',
    color: '#FCFF52',
    textColor: '#000',
  },
  {
    id: 'cUSD',
    name: 'cUSD',
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    description: 'Celo Dollar stablecoin',
    color: '#45CD85',
    textColor: '#fff',
  },
  {
    id: 'USDC',
    name: 'USDC',
    address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    description: 'Native USDC on Celo',
    color: '#2775CA',
    textColor: '#fff',
  },
  {
    id: 'USDT',
    name: 'USDT',
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', // Correct checksum
    description: 'Tether USD',
    color: '#50AF95',
    textColor: '#fff',
  },
  {
    id: 'axlUSDC',
    name: 'axlUSDC',
    address: '0xEB466342C4d449BC9f53A865D5Cb90586f405215',
    description: 'Axelar bridged USDC',
    color: '#000',
    textColor: '#fff',
  },
] as const;

type TokenId = (typeof SUPPORTED_TOKENS)[number]['id'];

export default function Page() {
  const [selectedToken, setSelectedToken] = useState<TokenId>('CELO');
  const token = SUPPORTED_TOKENS.find((t) => t.id === selectedToken)!;

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <Section className="mt-6" containerClassName="space-y-6 max-w-screen-md">
      <H1>Deposit to Celo</H1>

      {/* Main deposit card */}
      <div className="flex max-w-xl flex-col self-center border border-taupe-300 bg-white p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="font-serif text-xl">Cross-Chain Deposit</h2>
            <h3 className="text-sm text-taupe-600">Powered by Daimo Pay</h3>
            <p className="mt-1 text-sm">
              Deposit from any chain or wallet. Your funds are automatically bridged and converted
              to your selected token on Celo.
            </p>
          </div>
        </div>

        {/* Token Selection */}
        <div className="mt-6 border-t border-taupe-300 pt-5">
          <label className="mb-3 block text-sm font-medium">Select token to receive</label>
          <div className="grid grid-cols-5 gap-2">
            {SUPPORTED_TOKENS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedToken(t.id)}
                className={`flex flex-col items-center justify-center border-2 p-2.5 transition-all sm:p-3 ${
                  selectedToken === t.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-taupe-300 bg-white hover:border-taupe-400'
                }`}
              >
                <div
                  className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: t.color, color: t.textColor }}
                >
                  {t.id === 'axlUSDC' ? 'axl' : t.name.slice(0, 2)}
                </div>
                <span className="text-xs font-medium">{t.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-taupe-600">{token.description}</p>
        </div>

        {/* Deposit Button or Connect Wallet */}
        <div className="mt-6 flex flex-col items-center">
          {isConnected && address ? (
            <>
              <p className="mb-3 text-sm text-taupe-600">
                Depositing to:{' '}
                <span className="font-mono font-medium">{shortenAddress(address)}</span>
              </p>
              <DepositButton token={token} toAddress={address} />
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <p className="text-center text-sm text-taupe-600">
                Connect your wallet to deposit funds to your Celo address.
              </p>
              <SolidButton
                className="bg-primary px-8 text-primary-content"
                onClick={openConnectModal}
              >
                <span className="flex items-center space-x-2">
                  <span>Connect Wallet</span>
                  <ChevronIcon direction="e" width={12} height={12} />
                </span>
              </SolidButton>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-sm text-taupe-600">
        Daimo Pay is an independent, third-party service provider.
        <br />
        Celo assumes no responsibility for its operation.
      </p>
    </Section>
  );
}

function DepositButton({
  token,
  toAddress,
}: {
  token: (typeof SUPPORTED_TOKENS)[number];
  toAddress: `0x${string}`;
}) {
  const { resetPayment } = useDaimoPayUI();

  // Call resetPayment when the button is clicked, not on every render
  const handleClick = () => {
    resetPayment({
      toChain: celo.id,
      toAddress: toAddress,
      toToken: getAddress(token.address),
    });
  };

  return (
    <DaimoPayButton.Custom
      appId={DAIMO_APP_ID}
      toChain={celo.id}
      toAddress={toAddress}
      toToken={getAddress(token.address)}
      intent="Deposit"
      refundAddress={toAddress}
    >
      {({ show }) => (
        <SolidButton
          className="bg-primary px-8 text-primary-content"
          onClick={() => {
            handleClick();
            show();
          }}
        >
          <span className="flex items-center space-x-2">
            <span>Deposit {token.name}</span>
            <ChevronIcon direction="e" width={12} height={12} />
          </span>
        </SolidButton>
      )}
    </DaimoPayButton.Custom>
  );
}
