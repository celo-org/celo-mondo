import clsx from 'clsx';
import { Field, FieldAttributes } from 'formik';

export function TextField({ className, ...props }: FieldAttributes<{ className?: string }>) {
  return (
    <Field
      className={clsx(
        'input input-bordered input-secondary h-fit min-h-fit rounded-none py-2',
        className,
      )}
      {...props}
    />
  );
}
