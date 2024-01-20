import BigNumber from 'bignumber.js';
import { CELO, TokenId, getTokenByAddress, getTokenById } from 'src/config/tokens';
import { fromWei } from 'src/utils/amount';

const NUMBER_FORMAT = {
  decimalSeparator: '.',
  groupSeparator: ',',
  groupSize: 3,
};

export function Amount({
  value,
  valueWei,
  tokenId,
  tokenAddress,
  className,
  decimals = 2,
  showSymbol = true,
}: {
  value?: BigNumber.Value | bigint;
  valueWei?: BigNumber.Value | bigint;
  tokenId?: TokenId;
  tokenAddress?: Address;
  className?: string;
  decimals?: number;
  showSymbol?: boolean;
}) {
  if (valueWei) {
    value = fromWei(valueWei);
  }
  const valueFormatted = formatNumberString(value, decimals);

  const token =
    (tokenId ? getTokenById(tokenId) : tokenAddress ? getTokenByAddress(tokenAddress) : null) ||
    CELO;

  return (
    <span className={`font-serif ${className}`}>{`${valueFormatted} ${
      showSymbol ? token.symbol : ''
    }`}</span>
  );
}

export function formatNumberString(value?: BigNumber.Value | bigint, decimals = 0) {
  return BigNumber(value?.toString() || '0')
    .decimalPlaces(decimals, BigNumber.ROUND_FLOOR)
    .toFormat(NUMBER_FORMAT);
}
