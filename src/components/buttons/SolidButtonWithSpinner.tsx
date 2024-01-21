import { PropsWithChildren } from 'react';
import { Spinner } from 'src/components/animation/Spinner';
import { SolidButton } from 'src/components/buttons/SolidButton';

type Props = React.ComponentProps<typeof SolidButton> & {
  isLoading: boolean;
  loadingText?: string;
};

export function SolidButtonWithSpinner({
  children,
  isLoading,
  loadingText,
  ...props
}: PropsWithChildren<Props>) {
  return (
    <SolidButton disabled={isLoading} {...props}>
      <div className="flex items-center space-x-2">
        {isLoading && <Spinner size="xs" />}
        <span>{isLoading ? loadingText || 'Submitting' : children}</span>
      </div>
    </SolidButton>
  );
}
