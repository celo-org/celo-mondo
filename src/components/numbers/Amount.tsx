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
}: {
  value?: BigNumber.Value | bigint;
  valueWei?: string;
  tokenId?: TokenId;
  tokenAddress?: Address;
  className?: string;
}) {
  if (valueWei) {
    value = fromWei(valueWei);
  }
  const valueFormatted = BigNumber(value?.toString() || '0').toFormat(NUMBER_FORMAT);

  const token =
    (tokenId ? getTokenById(tokenId) : tokenAddress ? getTokenByAddress(tokenAddress) : null) ||
    CELO;

  return <span className={`font-serif ${className}`}>{`${valueFormatted} ${token.symbol}`}</span>;
}
