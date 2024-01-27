import { Field, useField } from 'formik';
import { useEffect } from 'react';
import { toTitleCase } from 'src/utils/strings';

export function RadioField<T extends string = string>({
  name,
  values,
  defaultValue,
  disabled,
  className,
}: {
  name: string;
  values: T[];
  defaultValue?: T;
  disabled?: boolean;
  className?: string;
}) {
  const [, , helpers] = useField<T>(name);

  useEffect(() => {
    helpers.setValue(defaultValue || values[0]);
  }, [defaultValue, values, helpers]);

  return (
    <div role="group" className={`flex items-center justify-between space-x-8 px-1 ${className}`}>
      {values.map((v) => (
        <label key={v} className="flex items-center text-sm">
          <Field type="radio" name={name} value={v} className="radio mr-1.5" disabled={disabled} />
          {toTitleCase(v)}
        </label>
      ))}
    </div>
  );
}
