import { useMemo } from 'react';
import { SpinnerWithLabel } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Amount } from 'src/components/numbers/Amount';
import { Delegatee } from 'src/features/delegation/types';
import { useDelegateeHistory } from 'src/features/delegation/useDelegateeHistory';
import { VotingPower } from 'src/features/governance/components/VotingPower';
import { VoteAmounts } from 'src/features/governance/types';
import { TransactionFlowType } from 'src/features/transactions/TransactionFlowType';
import { useTransactionModal } from 'src/features/transactions/TransactionModal';
import { bigIntMax } from 'src/utils/math';
import { objLength } from 'src/utils/objects';

export function DelegateButton({ delegatee }: { delegatee: Delegatee }) {
  const { proposalToVotes } = useDelegateeHistory(delegatee.address);

  const showTxModal = useTransactionModal(TransactionFlowType.Delegate, {
    delegatee: delegatee.address,
  });

  return (
    <div className="space-y-4 border-taupe-300 p-3 lg:mt-4 lg:border">
      <div className="flex items-center justify-between gap-8">
        <h2 className="font-serif text-2xl">Delegate</h2>
        <VotingPower />
      </div>
      <SolidButton
        className="btn-neutral w-full"
        onClick={() => showTxModal()}
      >{`️🗳️ Delegate voting power`}</SolidButton>
      <div>
        <h3 className="text-sm">{`Delegate's current voting power`}</h3>
        <Amount valueWei={delegatee.votingPower} className="text-xl" />
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
