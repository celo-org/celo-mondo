import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Amount } from 'src/components/numbers/Amount';
import { useAccountDetails, useVoteSigner } from 'src/features/account/hooks';
import { useDelegateeHistory } from 'src/features/delegation/hooks/useDelegateeHistory';
import { Delegatee } from 'src/features/delegation/types';
import { VotingPower } from 'src/features/governance/components/VotingPower';
import { VoteAmounts } from 'src/features/governance/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { bigIntMax } from 'src/utils/math';
import { objLength } from 'src/utils/objects';
import { useAccount } from 'wagmi';

export function DelegateButton({ delegatee }: { delegatee: Delegatee }) {
  const { address } = useAccount();
  const { voteSigner } = useVoteSigner(address);
  const { isValidator, isValidatorGroup } = useAccountDetails(address, voteSigner);
  const { proposalToVotes } = useDelegateeHistory(delegatee.address);
  const showTxModal = useTransactionModal(TransactionFlowType.Delegate, {
    delegatee: delegatee.address,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Delegate</h2>
        <VotingPower />
      </div>
      <div>
        <SolidButton
          className="btn-neutral w-full"
          disabled={isValidator === true || isValidatorGroup === true}
          onClick={() => showTxModal()}
        >{`️🗳️ Delegate voting power`}</SolidButton>
        {(isValidator || isValidatorGroup) && (
          <p className={'text-md pt-1 text-red-600'}>
            Validators and validator groups (as well as their signers) cannot delegate their voting
            power.
          </p>
        )}
        {delegatee.delegatedByPercent > 0 && (
          <p className={'text-md pt-1 text-red-600'}>
            Delegatee is currently delegating{' '}
            <span className={'font-bold'}>{delegatee.delegatedByPercent}%</span> of their voting
            power.
          </p>
        )}
      </div>
      <div>
        <h3 className="text-sm">{`Delegate's current voting power`}</h3>
        <Amount valueWei={delegatee.votingPower} className="text-xl" />
      </div>
      <div>
        <h3 className="text-sm">{`Delegated`}</h3>
        <Amount valueWei={delegatee.delegatedToBalance} className="text-xl" />
      </div>
      <div className="border-taupe-30 border-t pt-4">
        {proposalToVotes ? (
          <VoteStats proposalToVotes={proposalToVotes} />
        ) : (
          <SpinnerWithLabel>Loading delegate history</SpinnerWithLabel>
        )}
      </div>
    </div>
  );
}

function VoteStats({ proposalToVotes }: { proposalToVotes: Record<number, VoteAmounts> }) {
  const counts = useMemo(() => {
    return Object.entries(proposalToVotes).reduce(
      (acc, [_, votes]) => {
        const voteValues = Object.values(votes);
        const max = bigIntMax(...voteValues);
        const indexOfMax = voteValues.indexOf(max);
        if (indexOfMax >= 0) acc[indexOfMax]++;
        return acc;
      },
      [0, 0, 0],
    );
  }, [proposalToVotes]);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Proposals Voted</span>
        <span>{objLength(proposalToVotes)}</span>
      </div>
      <div className="flex justify-between">
        <span>Yes / No / Abstain</span>
        <span>{`${counts[0]} / ${counts[1]} / ${counts[2]}`}</span>
      </div>
    </div>
  );
}
