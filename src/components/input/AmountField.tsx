import { useFormikContext } from 'formik';
import { ReactNode, useMemo } from 'react';
import { OutlineButton } from 'src/components/buttons/OutlineButton';
import { NumberField } from 'src/components/input/NumberField';
import { formatNumberString } from 'src/components/numbers/Amount';
import { MIN_REMAINING_BALANCE } from 'src/config/consts';
import { TokenId } from 'src/config/tokens';
import { fromWei } from 'src/utils/amount';

export function AmountField({
  maxWalletValueWei,
  maxButtonValueWei,
  maxDescription,
  disabled,
  tokenId,
  zeroBalanceMessage,
}: {
  maxWalletValueWei: bigint;
  maxButtonValueWei?: bigint;
  maxDescription: string;
  disabled?: boolean;
  tokenId: TokenId;
  zeroBalanceMessage?: ReactNode;
}) {
  const { setFieldValue } = useFormikContext();

  const maxWalletValue = useMemo(
    () =>
      Math.max(
        0,
        fromWei(
          tokenId === TokenId.CELO ? maxWalletValueWei - MIN_REMAINING_BALANCE : maxWalletValueWei,
        ),
      ),
    [maxWalletValueWei, tokenId],
  );

  const maxButtonValue = useMemo(() => {
    if (maxButtonValueWei == null) {
      return maxWalletValue;
    }

    return Math.max(0, fromWei(maxButtonValueWei));
  }, [maxButtonValueWei, maxWalletValue]);

  const onClickMax = async () => {
    if (disabled) return;

    if (maxWalletValue > maxButtonValue) {
      await setFieldValue('amount', maxButtonValue);
      return;
    }

    await setFieldValue('amount', maxWalletValue);
  };

  const _disabled = maxWalletValue === 0 || maxButtonValue === 0 || disabled;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="amount" className="pl-0.5 text-xs font-medium">
          Amount
        </label>
        <span className="text-xs">
          {maxWalletValue <= 0 && zeroBalanceMessage
            ? zeroBalanceMessage
            : `${formatNumberString(maxWalletValue, 5)} ${maxDescription}`}
        </span>
      </div>
      <div className="relative mt-2">
        <NumberField
          name="amount"
          className="w-full text-lg all:py-2"
          disabled={_disabled}
          data-testid="amount-input"
        />
        <div className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2">
          <OutlineButton
            onClick={onClickMax}
            type="button"
            className="all:py-1.5"
            disabled={_disabled}
            data-testid="max-button"
          >
            Max
          </OutlineButton>
        </div>
      </div>
    </div>
  );
}
