import BigNumber from 'bignumber.js';
import { DEFAULT_TOKEN_DECIMALS } from 'src/config/consts';
import { fromWei, numberFromWei, toWei } from './amount'; // Assuming toWei might be useful for test setup

describe('amount utils', () => {
  describe('fromWei', () => {
    it('should convert Wei to Ether (bigint, default decimals)', () => {
      expect(fromWei(toWei('1'))).toBe(1n);
      expect(fromWei(toWei('1.23'))).toBe(1n); // Truncates
      expect(fromWei(toWei('0.5'))).toBe(0n);
      expect(fromWei(1_000_000_000_000_000_000n)).toBe(1n); // 1 Ether
      expect(fromWei(1_230_000_000_000_000_000n)).toBe(1n); // 1.23 Ether
    });

    it('should handle zero, null, and undefined inputs', () => {
      expect(fromWei(0n)).toBe(0n);
      expect(fromWei(toWei('0'))).toBe(0n);
      expect(fromWei(null)).toBe(0n);
      expect(fromWei(undefined)).toBe(0n);
    });

    it('should handle large numbers correctly', () => {
      const veryLargeEther = 2_000_000_000n; // 2 billion Ether
      const veryLargeWei = veryLargeEther * (10n ** BigInt(DEFAULT_TOKEN_DECIMALS));
      expect(fromWei(veryLargeWei)).toBe(veryLargeEther);
    });

    it('should work with different decimal values', () => {
      const usdcDecimals = 6;
      // 100 USDC (100 * 10^6)
      expect(fromWei(100_000_000n, usdcDecimals)).toBe(100n);
      // 123.45 USDC (123.45 * 10^6) -> 123_450_000
      expect(fromWei(123_450_000n, usdcDecimals)).toBe(123n);
    });

    it('should handle string inputs for Wei values', () => {
      expect(fromWei('1000000000000000000')).toBe(1n);
      expect(fromWei('1230000000000000000')).toBe(1n);
    });

    it('should handle BigNumber inputs for Wei values', () => {
      expect(fromWei(BigNumber('1000000000000000000'))).toBe(1n);
      expect(fromWei(BigNumber('1230000000000000000'))).toBe(1n);
    });
  });

  describe('numberFromWei', () => {
    it('should convert Wei to Ether (number, default decimals)', () => {
      expect(numberFromWei(toWei('1'))).toBe(1);
      expect(numberFromWei(toWei('1.23'))).toBe(1); // Truncates then converts
      expect(numberFromWei(toWei('0.5'))).toBe(0);
      expect(numberFromWei(1_000_000_000_000_000_000n)).toBe(1);
      expect(numberFromWei(1_230_000_000_000_000_000n)).toBe(1);
    });

    it('should handle zero, null, and undefined inputs', () => {
      expect(numberFromWei(0n)).toBe(0);
      expect(numberFromWei(toWei('0'))).toBe(0);
      expect(numberFromWei(null)).toBe(0);
      expect(numberFromWei(undefined)).toBe(0);
    });

    it('should handle large numbers (precision loss if > MAX_SAFE_INTEGER)', () => {
      const largeEther = BigInt(Number.MAX_SAFE_INTEGER) + 100n; // Exceeds max safe integer for numbers
      const largeWei = largeEther * (10n ** BigInt(DEFAULT_TOKEN_DECIMALS));
      // fromWei will produce largeEther (bigint)
      // Number(largeEther) will convert, potentially losing precision if it were fractional, but fromWei truncates.
      // The key is that fromWei itself doesn't use floating points.
      expect(numberFromWei(largeWei)).toBe(Number(largeEther));

      const veryLargeEther = 2_000_000_000_000_000_000n; // 2 quintillion Ether (well beyond Number limits for exact int)
      const veryLargeWei = veryLargeEther * (10n ** BigInt(DEFAULT_TOKEN_DECIMALS));
      expect(numberFromWei(veryLargeWei)).toBe(Number(veryLargeEther)); // Will be imprecise
      expect(numberFromWei(veryLargeWei)).not.toBe(veryLargeEther); // Demonstrating it's not the bigint
    });

    it('should work with different decimal values', () => {
      const usdcDecimals = 6;
      // 100 USDC (100 * 10^6)
      expect(numberFromWei(100_000_000n, usdcDecimals)).toBe(100);
      // 123.45 USDC (123.45 * 10^6) -> 123_450_000
      expect(numberFromWei(123_450_000n, usdcDecimals)).toBe(123);
    });

    it('should handle string inputs for Wei values', () => {
      expect(numberFromWei('1000000000000000000')).toBe(1);
      expect(numberFromWei('1230000000000000000')).toBe(1);
    });

    it('should handle BigNumber inputs for Wei values', () => {
      expect(numberFromWei(BigNumber('1000000000000000000'))).toBe(1);
      expect(numberFromWei(BigNumber('1230000000000000000'))).toBe(1);
    });
  });
});
