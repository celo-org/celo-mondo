import { useFormikContext } from 'formik';
import { useMemo } from 'react';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { NumberField } from 'src/components/input/NumberField';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MIN_REMAINING_BALANCE } from 'src/config/consts';
import { TokenId } from 'src/config/tokens';
import { fromWei } from 'src/utils/amount';

export enum ZeroMaxValueReason {
  DEFAULT = 'DEFEAULT',
  GROUP_AT_CAPACITY = 'GROUP_AT_CAPACITY',
}

export function AmountField({
  maxValueWei,
  maxDescription,
  disabled,
  tokenId,
  zeroMaxValueReason,
}: {
  maxValueWei: bigint;
  maxDescription: string;
  disabled?: boolean;
  tokenId: TokenId;
  zeroMaxValueReason?: ZeroMaxValueReason;
}) {
  const { setFieldValue } = useFormikContext();

  const maxValue = useMemo(
    () =>
      Math.max(
        0,
        fromWei(tokenId === TokenId.CELO ? maxValueWei - MIN_REMAINING_BALANCE : maxValueWei),
      ),
    [maxValueWei, tokenId],
  );

  const onClickMax = async () => {
    if (disabled) return;
    await setFieldValue('amount', maxValue);
  };

  const _disabled = maxValue === 0 || disabled;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="amount" className="pl-0.5 text-xs font-medium">
          Amount
        </label>
        <span className="text-xs">
          {maxValue <= 0 && tokenId === TokenId.CELO
            ? getZeroValueReasonDescription(zeroMaxValueReason)
            : `${formatNumberString(maxValue, 5)} ${maxDescription}`}
        </span>
      </div>
      <div className="relative mt-2">
        <NumberField name="amount" className="w-full text-lg all:py-2" disabled={_disabled} />
        <div className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2">
          <OutlineButton
            onClick={onClickMax}
            type="button"
            className="all:py-1.5"
            disabled={_disabled}
          >
            Max
          </OutlineButton>
        </div>
      </div>
    </div>
  );
}

const getZeroValueReasonDescription = (zeroMaxValueReason?: ZeroMaxValueReason): string => {
  if (zeroMaxValueReason) {
    switch (zeroMaxValueReason) {
      case ZeroMaxValueReason.GROUP_AT_CAPACITY:
        return 'Group is at capacity';
    }
  }

  // ZeroMaxValueReason.DEFEAULT and undefined both end here
  return 'Not enough CELO to cover gas fees';
};
