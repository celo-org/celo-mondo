import { Form, Formik, FormikErrors } from 'formik';
import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { ProposalFormDetails } from 'src/features/governance/components/ProposalFormDetails';
import { useProposalQueue } from 'src/features/governance/hooks/useProposalQueue';
import { useProposalUpvoters } from 'src/features/governance/hooks/useProposalUpvoters';
import {
  useGovernanceVotingPower,
  useIsGovernanceUpVoting,
} from 'src/features/governance/hooks/useVotingStatus';
import { UpvoteFormValues, UpvoteRecord } from 'src/features/governance/types';
import { getUpvoteTxPlan } from 'src/features/governance/votePlan';
import { OnConfirmedFn } from 'src/features/transactions/types';
import { useTransactionPlan } from 'src/features/transactions/useTransactionPlan';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import { isNullish } from 'src/utils/typeof';
import { useAccount } from 'wagmi';

const initialValues: UpvoteFormValues = {
  proposalId: 0,
};

export function UpvoteForm({
  defaultFormValues,
  onConfirmed,
}: {
  defaultFormValues?: Partial<UpvoteFormValues>;
  onConfirmed: OnConfirmedFn;
}) {
  const { address } = useAccount();
  const { queue } = useProposalQueue();
  const { isUpvoting } = useIsGovernanceUpVoting(address);
  const { votingPower } = useGovernanceVotingPower(address);
  const { refetch: refetchUpvoters } = useProposalUpvoters();

  const { getNextTx, onTxSuccess } = useTransactionPlan<UpvoteFormValues>({
    createTxPlan: (v) => getUpvoteTxPlan(v, queue || [], votingPower || 0n),
    onStepSuccess: () => refetchUpvoters(),
    onPlanSuccess: (v, r) =>
      onConfirmed({
        message: 'Upvote successful',
        receipt: r,
        properties: [{ label: 'Proposal', value: `#${v.proposalId}` }],
      }),
  });
  const { writeContract, isLoading } = useWriteContractWithReceipt('upvote', onTxSuccess);

  const onSubmit = (values: UpvoteFormValues) => writeContract(getNextTx(values));

  const validate = (values: UpvoteFormValues) => {
    if (!address || !queue || isNullish(votingPower)) return { amount: 'Form data not ready' };
    return validateForm(values, queue, isUpvoting);
  };

  return (
    <Formik<UpvoteFormValues>
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
        <Form className="mt-4 flex flex-1 flex-col justify-between">
          <div className="space-y-3">
            <ProposalFormDetails proposalId={values.proposalId} votingPower={votingPower} />
          </div>
          <FormSubmitButton isLoading={isLoading} loadingText={'Upvoting'}>
            Upvote
          </FormSubmitButton>
        </Form>
      )}
    </Formik>
  );
}

function validateForm(
  values: UpvoteFormValues,
  queue: UpvoteRecord[],
  isUpvoting: boolean,
): FormikErrors<UpvoteFormValues> {
  const { proposalId } = values;

  if (!queue.find((p) => p.proposalId === proposalId)) {
    return { proposalId: 'Proposal ID not eligible' };
  }

  if (isUpvoting) {
    // TODO consider re-enabling this check but first
    // we must handle case where previous upvote proposal is done
    // return { proposalId: 'Account already upvoting' };
  }

  return {};
}
