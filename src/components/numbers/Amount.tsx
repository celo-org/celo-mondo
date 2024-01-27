import BigNumber from 'bignumber.js';
import { CELO, TokenId, getTokenByAddress, getTokenById } from 'src/config/tokens';
import { fromWei } from 'src/utils/amount';
import { isNullish } from 'src/utils/typeof';

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
  const valueFormatted = formatNumberString(value ?? valueWei, decimals, isNullish(value));

  const token =
    (tokenId ? getTokenById(tokenId) : tokenAddress ? getTokenByAddress(tokenAddress) : null) ||
    CELO;

  return (
    <span className={`flex items-baseline space-x-1 font-serif ${className}`}>
      <span>{valueFormatted}</span>
      {showSymbol ? <span style={{ fontSize: '0.8em' }}>{token.symbol}</span> : null}
    </span>
  );
}

export function formatNumberString(value?: BigNumber.Value | bigint, decimals = 0, isWei = false) {
  const valueUnits = isWei ? fromWei(value) : value;
  const valueBN = BigNumber(valueUnits?.toString() || '0');

  const roundedDown = valueBN
    .decimalPlaces(decimals, BigNumber.ROUND_FLOOR)
    .toFormat(NUMBER_FORMAT);

  if (roundedDown === '0' && valueBN.gt(0)) {
    const epsilon = Math.pow(10, -decimals);
    return `<${epsilon}`;
  } else {
    return roundedDown;
  }
}
