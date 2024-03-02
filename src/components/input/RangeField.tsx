import { Field } from 'formik';

export function RangeField({
  name,
  label,
  maxValue,
  maxDescription,
  disabled,
}: {
  name: string;
  label: string;
  maxValue: number;
  maxDescription: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={name} className="pl-0.5 text-xs font-medium">
          {label}
        </label>
        <span className="text-xs">{`${maxDescription} ${maxValue}`}</span>
      </div>
      <div className="relative mt-2">
        <Field
          name={name}
          type="range"
          min={0}
          max={100}
          step={1}
          className="range range-secondary rounded-full"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
