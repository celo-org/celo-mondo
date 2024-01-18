import { useFormikContext } from 'formik';
import { useMemo } from 'react';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { NumberField } from 'src/components/input/NumberField';
import { formatNumberString } from 'src/components/numbers/Amount';
import { fromWeiRounded } from 'src/utils/amount';

export function AmountField({
  maxValueWei,
  maxDescription,
  disabled,
}: {
  maxValueWei: bigint;
  maxDescription: string;
  disabled?: boolean;
}) {
  const { setFieldValue } = useFormikContext();

  const maxValue = useMemo(() => fromWeiRounded(maxValueWei), [maxValueWei]);

  const onClickMax = async () => {
    await setFieldValue('amount', maxValue);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="amount" className="pl-0.5 text-sm">
          Amount
        </label>
        <span className="text-xs">{`${formatNumberString(maxValue, 2)} ${maxDescription}`}</span>
      </div>
      <div className="relative mt-2">
        <NumberField name="amount" className="w-full all:py-3" disabled={disabled} />
        <div className="absolute right-1 top-2 z-10">
          <OutlineButton onClick={onClickMax} type="button">
            Max
          </OutlineButton>
        </div>
      </div>
    </div>
  );
}
