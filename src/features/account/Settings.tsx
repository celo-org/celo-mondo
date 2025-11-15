import { useState } from 'react';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Modal, useModal } from 'src/components/menus/Modal';
import { ZERO_ADDRESS } from 'src/config/consts';
import { useGetVoteSignerFor, useVoteSignerToAccount } from 'src/features/account/hooks';
import { useLockedStatus } from 'src/features/locking/useLockedStatus';
import { getTotalLockedCelo } from 'src/features/locking/utils';
import useAddressToLabel from 'src/utils/useAddressToLabel';
import { isAddress, isHex } from 'viem';
import { useAccount } from 'wagmi';

export default function Settings() {
  const account = useAccount();
  const address = account?.address;

  const { data: voteSigner } = useGetVoteSignerFor(address);
  const { signingFor, isVoteSigner } = useVoteSignerToAccount(address);
  const { lockedBalances } = useLockedStatus(signingFor);
  const addressToLabel = useAddressToLabel();

  const totalLocked = getTotalLockedCelo(lockedBalances);
  const hasVoteSigner = voteSigner && voteSigner !== ZERO_ADDRESS && voteSigner !== address;
  const hasLockedCelo = totalLocked && totalLocked > 0n;

  const {
    isModalOpen: isPrepareModalOpen,
    openModal: openPrepareModal,
    closeModal: closePrepareModal,
  } = useModal();

  const {
    isModalOpen: isAuthorizeModalOpen,
    openModal: openAuthorizeModal,
    closeModal: closeAuthorizeModal,
  } = useModal();

  const [principalAddress, setPrincipalAddress] = useState('');
  const [proofOfPossession, setProofOfPossession] = useState('');

  const isValidPrincipalAddress = (address: string): boolean => {
    return isAddress(address.trim());
  };

  const isValidProofOfPossession = (hex: string): boolean => {
    const trimmed = hex.trim();
    return trimmed.length > 2 && isHex(trimmed, { strict: true });
  };

  const prepareVoteSigner = () => {
    openPrepareModal();
  };

  const handleAuthorizeVoteSigner = () => {
    openAuthorizeModal();
  };

  const handlePrepareSign = () => {
    // TODO: Implement generate proof-of-possession functionality
    console.log('Generate proof-of-possession for principal:', principalAddress);
    closePrepareModal();
  };

  const handleAuthorizeSign = () => {
    // TODO: Implement authorize vote signer functionality
    console.log('Authorize vote signer with PoP:', proofOfPossession);
    closeAuthorizeModal();
  };

  return (
    <div className="pt-6">
      <div className="space-y-6">
        <div>
          <h3 className="mb-4 text-lg font-medium">Vote Signer Setup</h3>

          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <h4 className="mb-2 font-medium text-gray-900">How Vote Signing Works</h4>
            <p className="mb-3 text-sm text-gray-700">
              Vote signing allows you to separate your locked CELO (voting rights) from the account
              that actually submits votes.
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <strong>Principal Account:</strong> Has locked CELO and voting rights, authorizes
                another account
              </div>
              <div>
                <strong>Vote Signer Account:</strong> Has minimal CELO for gas fees, votes on behalf
                of the Principal
              </div>
            </div>

            {address && (
              <div className="mt-4 rounded bg-blue-50 p-3">
                <div className="text-sm">
                  <strong>Your current account:</strong>{' '}
                  {isVoteSigner ? (
                    <span className="text-blue-700">
                      Vote Signer Account (voting for {addressToLabel(signingFor!)})
                    </span>
                  ) : hasLockedCelo ? (
                    <span className="text-green-700">
                      Principal Account (has{' '}
                      {totalLocked ? (Number(totalLocked) / 1e18).toFixed(2) : '0'} locked CELO)
                    </span>
                  ) : (
                    <span className="text-gray-700">Regular Account (no locked CELO)</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center space-x-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-medium text-white">
                  1
                </span>
                <h4 className="font-medium">Generate Proof of Possession</h4>
              </div>
              <p className="mb-3 text-sm text-gray-600">
                The account that will vote (vote signer) must first generate a cryptographic proof
                of possession.
              </p>
              {!hasLockedCelo && !isVoteSigner && (
                <div className="bg-yellow-50 text-yellow-800 mb-3 rounded p-2 text-sm">
                  <strong>Use this step if:</strong> This account will vote on behalf of another
                  account with locked CELO
                </div>
              )}
              {hasLockedCelo && (
                <div className="bg-orange-50 text-orange-800 mb-3 rounded p-2 text-sm">
                  <strong>Note:</strong> Switch to the account that will vote (without locked CELO)
                  to generate the proof
                </div>
              )}
              <SolidButton onClick={prepareVoteSigner} className="px-4 py-2 text-sm">
                Prepare Vote Signer
              </SolidButton>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-center space-x-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-xs font-medium text-white">
                  2
                </span>
                <h4 className="font-medium">Authorize Vote Signer</h4>
              </div>
              <p className="mb-3 text-sm text-purple-500">
                The account with locked CELO (Principal) uses the proof of possession to authorize
                the vote signer.
              </p>
              {hasLockedCelo && (
                <div className="bg-green-50 text-green-800 mb-3 rounded p-2 text-sm">
                  <strong>Perfect!</strong> This account has locked CELO and can authorize a vote
                  signer
                </div>
              )}
              {!hasLockedCelo && !isVoteSigner && (
                <div className="bg-orange-50 text-orange-800 mb-3 rounded p-2 text-sm">
                  <strong>Note:</strong> Switch to the account with locked CELO to authorize a vote
                  signer
                </div>
              )}
              <div className="flex items-center space-x-4">
                <SolidButton onClick={handleAuthorizeVoteSigner} className="px-4 py-2 text-sm">
                  Authorize Vote Signer
                </SolidButton>
                {hasVoteSigner && (
                  <span className="text-sm text-taupe-600">
                    Current: {addressToLabel(voteSigner)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isPrepareModalOpen}
        close={closePrepareModal}
        title="Prepare Vote Signer"
        dialogClassName="max-w-md rounded-lg"
      >
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-600">
            Enter the address of the Principal Account (the account with locked CELO that you want
            to vote for):
          </p>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Principal Account Address
            </label>
            <input
              type="text"
              value={principalAddress}
              onChange={(e) => setPrincipalAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex space-x-3">
            <SolidButton
              onClick={handlePrepareSign}
              disabled={!isValidPrincipalAddress(principalAddress)}
              className="px-4 py-2 text-sm"
            >
              Sign
            </SolidButton>
            <button
              onClick={closePrepareModal}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAuthorizeModalOpen}
        close={closeAuthorizeModal}
        title="Authorize Vote Signer"
        dialogClassName="max-w-md rounded-lg"
      >
        <div className="p-4">
          <p className="mb-4 text-sm text-gray-600">
            Enter the Proof of Possession (PoP) generated by the Vote Signer Account:
          </p>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Proof of Possession (Hex)
            </label>
            <textarea
              value={proofOfPossession}
              onChange={(e) => setProofOfPossession(e.target.value)}
              placeholder="0x..."
              rows={4}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex space-x-3">
            <SolidButton
              onClick={handleAuthorizeSign}
              disabled={!isValidProofOfPossession(proofOfPossession)}
              className="px-4 py-2 text-sm"
            >
              Sign
            </SolidButton>
            <button
              onClick={closeAuthorizeModal}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
