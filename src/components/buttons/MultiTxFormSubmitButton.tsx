import { FormSubmitButton } from 'src/components/buttons/FormSubmitButton';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { TipBox } from 'src/components/layout/TipBox';

type Props = React.ComponentProps<typeof SolidButtonWithSpinner> & {
  txIndex: number;
  numTxs: number;
  tipText?: string;
};

export function MultiTxFormSubmitButton({
  txIndex,
  numTxs,
  tipText,
  isLoading,
  loadingText,
  children,
}: Props) {
  const txIndexString = numTxs > 1 ? ` (${txIndex + 1} / ${numTxs})` : '';

  return (
    <div className="flex flex-col space-y-2">
      {numTxs > 1 && (
        <TipBox color="yellow">
          {`This action will require ${numTxs} transactions. ${tipText}`}
        </TipBox>
      )}
      <FormSubmitButton isLoading={isLoading} loadingText={`${loadingText} ${txIndexString}`}>
        {`${children} ${txIndexString}`}
      </FormSubmitButton>
    </div>
  );
}
