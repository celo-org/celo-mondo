import { Form, Formik, FormikErrors } from 'formik';
import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { RadioField } from 'src/components/input/RadioField';
import { useVoteSignerToAccount } from 'src/features/account/hooks';
import { ProposalFormDetails } from 'src/features/governance/components/ProposalFormDetails';
import { useProposalDequeue } from 'src/features/governance/hooks/useProposalQueue';
import {
  useGovernanceVoteRecord,
  useGovernanceVotingPower,
} from 'src/features/governance/hooks/useVotingStatus';
import { VoteFormValues, VoteType, VoteTypes } from 'src/features/governance/types';
import { getVoteTxPlan } from 'src/features/governance/votePlan';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

const initialValues: VoteFormValues = {
  proposalId: 0,
  vote: VoteType.Yes,
};

export function VoteForm({
  defaultFormValues,
  onConfirmed,
}: {
  defaultFormValues?: Partial<VoteFormValues>;
  onConfirmed: OnConfirmedFn;
}) {
  const { address } = useAccount();
  const { isLoading: isSignerForLoading, signingFor } = useVoteSignerToAccount(address);
  const votingAccount = !isSignerForLoading ? (signingFor ?? address) : undefined;
  const { votingPower } = useGovernanceVotingPower(votingAccount);
  const { dequeue } = useProposalDequeue();
  const { refetch: refetchVoteRecord } = useGovernanceVoteRecord(
    votingAccount,
    defaultFormValues?.proposalId,
  );

  const { getNextTx, isPlanStarted, onTxSuccess } = useTransactionPlan<VoteFormValues>({
    createTxPlan: (v) => getVoteTxPlan(v, dequeue || []),
    onStepSuccess: () => refetchVoteRecord(),
    onPlanSuccess: (v, r) =>
      onConfirmed({
        message: 'Vote successful',
        receipt: r,
        properties: [
          { label: 'Vote', value: v.vote },
          { label: 'Proposal', value: `#${v.proposalId}` },
        ],
      }),
  });
  const { writeContract, isLoading } = useWriteContractWithReceipt('vote', onTxSuccess);
  const isInputDisabled = isLoading || isPlanStarted;

  const onSubmit = (values: VoteFormValues) => writeContract(getNextTx(values));

  const validate = (values: VoteFormValues) => {
    if (!votingAccount || !dequeue || isNullish(votingPower))
      return { amount: 'Form data not ready' };
    return validateForm(values, dequeue, votingPower);
  };

  return (
    <Formik<VoteFormValues>
      initialValues={{
        ...initialValues,
        ...defaultFormValues,
      }}
      onSubmit={onSubmit}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ values }) => (
        <Form className="mt-4 flex flex-1 flex-col justify-between" data-testid="vote-form">
          <div className="space-y-3">
            <ProposalFormDetails proposalId={values.proposalId} />
            <div className="px-0.5 py-1">
              <VoteTypeField defaultValue={defaultFormValues?.vote} disabled={isInputDisabled} />
            </div>
          </div>
          <FormSubmitButton isLoading={isLoading} loadingText={'Casting vote'}>
            Vote
          </FormSubmitButton>
        </Form>
      )}
    </Formik>
  );
}

function VoteTypeField({
  defaultValue,
  disabled,
}: {
  defaultValue?: VoteType;
  disabled?: boolean;
}) {
  return (
    <RadioField<VoteType>
      name="vote"
      values={VoteTypes}
      defaultValue={defaultValue}
      disabled={disabled}
    />
  );
}

function validateForm(
  values: VoteFormValues,
  dequeue: number[],
  votingPower: bigint,
): FormikErrors<VoteFormValues> {
  const { vote, proposalId } = values;

  if (!vote || !VoteTypes.includes(vote)) {
    return { vote: 'Invalid vote type' };
  }

  if (!dequeue?.includes(proposalId)) {
    return { proposalId: 'Proposal ID not eligible' };
  }

  if (votingPower <= 0n) {
    return { vote: 'No voting power available' };
  }

  return {};
}
