import { useFormikContext } from 'formik';
import { useCallback } from 'react';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { useTimeout } from 'src/utils/asyncHooks';
import { logger } from 'src/utils/logger';

type Props = React.ComponentProps<typeof SolidButtonWithSpinner>;

export function FormSubmitButton({ children, ...props }: Props) {
  const { errors, setErrors, touched, setTouched } = useFormikContext();

  const hasError = Object.keys(touched).length > 0 && Object.keys(errors).length > 0;
  const firstError = `${Object.values(errors)[0]}` || 'Unknown error';

  const className = hasError
    ? 'all:bg-error all:hover:bg-error all:hover:opacity-100'
    : 'bg-primary text-primary-content';
  const content = hasError ? firstError : children;

  // Automatically clear error state after a timeout
  const clearErrors = useCallback(async () => {
    logger.info('Clearing form errors');

    setErrors({});
    await setTouched({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setErrors, setTouched, errors, touched]);

  useTimeout(clearErrors, 3000);

  return (
    <SolidButtonWithSpinner type="submit" {...props} className={className}>
      {content}
    </SolidButtonWithSpinner>
  );
}
