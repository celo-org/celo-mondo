import { accountsABI } from '@celo/abis';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { ShortAddress } from 'src/components/text/ShortAddress';
import { config } from 'src/config/config';
import { Addresses } from 'src/config/contracts';
import { useGetVoteSignerFor, useVoteSignerToAccount } from 'src/features/account/hooks';
import { ProofOfPossessionForm } from 'src/features/account/ProofOfPossessionForm';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { eqAddress } from 'src/utils/addresses';
import { useConnection } from 'wagmi';

export function VoteSignerSettings() {
  const { address } = useConnection();
  const { signingFor, isVoteSigner } = useVoteSignerToAccount(address);
  const { data: voteSigner, refetch } = useGetVoteSignerFor(address);
  // getVoteSigner returns the account itself when nothing is authorized
  const hasVoteSigner = !!address && !!voteSigner && !eqAddress(voteSigner, address);
  const showTxModal = useTransactionModal(TransactionFlowType.AuthorizeVoteSigner);
  const { writeContract, isLoading: isRemoving } = useWriteContractWithReceipt(
    'vote signer removal',
    () => refetch(),
    true,
  );

  const onClickRemove = () =>
    writeContract({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'removeVoteSigner',
      chainId: config.chain.id,
    });

  return (
    <div className="mt-4 space-y-8" data-testid="vote-signer-settings">
      <section className="space-y-3">
        <h2 className="font-serif text-xl">Vote signer</h2>
        <p className="max-w-prose text-sm text-taupe-600">
          A vote signer is a separate wallet that can vote, stake and delegate on behalf of this
          account. It never holds your locked CELO, so you can keep the funded key offline and vote
          with a low-value one.
        </p>
        {isVoteSigner ? (
          <p className="text-sm" data-testid="vote-signer-status">
            This wallet is the vote signer for <ShortAddress address={signingFor!} />.
          </p>
        ) : hasVoteSigner ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm" data-testid="vote-signer-status">
              Current vote signer: <ShortAddress address={voteSigner} />
            </p>
            <OutlineButton onClick={onClickRemove} disabled={isRemoving}>
              {isRemoving ? 'Removing...' : 'Remove'}
            </OutlineButton>
          </div>
        ) : (
          <SolidButton
            className="bg-primary text-primary-content"
            onClick={() => showTxModal()}
            data-testid="authorize-vote-signer"
          >
            Authorize vote signer
          </SolidButton>
        )}
      </section>
      {!isVoteSigner && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl">Become a vote signer</h2>
          <p className="max-w-prose text-sm text-taupe-600">
            To vote on behalf of another account, sign a proof of possession with this wallet and
            give it to the account owner to authorize.
          </p>
          <ProofOfPossessionForm />
        </section>
      )}
    </div>
  );
}
