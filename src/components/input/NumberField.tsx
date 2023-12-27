import clsx from 'clsx';
import { FieldAttributes } from 'formik';
import { TextField } from 'src/components/input/TextField';

export function NumberField({ className, ...props }: FieldAttributes<{ className?: string }>) {
  return (
    <TextField
      className={clsx('font-serif', className)}
      type="number"
      step="any"
      placeholder="0.00"
      {...props}
    />
  );
}
