import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Formik } from 'formik';
import { MIN_REMAINING_BALANCE } from 'src/config/consts';
import { TokenId } from 'src/config/tokens';
import { toWei } from 'src/utils/amount';
import { describe, expect, it, vi } from 'vitest';
import { AmountField } from './AmountField';

vi.mock('src/utils/amount', () => ({
  fromWei: vi.fn((value: bigint) => Number(value) / 1e18),
  toWei: vi.fn((value: number) => BigInt(Math.floor(value * 1e18))),
}));

const renderAmountField = ({
  maxWalletValueWei,
  maxButtonValueWei,
  tokenId = TokenId.CELO,
  disabled = false,
  zeroBalanceMessage,
}: {
  maxWalletValueWei: bigint;
  maxButtonValueWei?: bigint;
  tokenId?: TokenId;
  disabled?: boolean;
  zeroBalanceMessage?: string;
}) => {
  return render(
    <Formik initialValues={{ amount: 0 }} onSubmit={() => {}}>
      <AmountField
        maxWalletValueWei={maxWalletValueWei}
        maxButtonValueWei={maxButtonValueWei}
        maxDescription="CELO available"
        disabled={disabled}
        tokenId={tokenId}
        zeroBalanceMessage={zeroBalanceMessage}
      />
    </Formik>,
  );
};

describe('AmountField', () => {
  describe('maxButtonValueWei scenarios', () => {
    const walletBalance = toWei(100); // 100 CELO

    it('should use wallet value when maxButtonValueWei is not provided', async () => {
      renderAmountField({
        maxWalletValueWei: walletBalance,
      });

      const maxButton = screen.getByTestId('max-button');
      const amountInput = screen.getByTestId('amount-input');

      await fireEvent.click(maxButton);

      await waitFor(() => {
        // Should set to wallet balance minus MIN_REMAINING_BALANCE for CELO
        const expectedValueWei = walletBalance - MIN_REMAINING_BALANCE;
        const expectedValue = Number(expectedValueWei) / 1e18;
        expect(amountInput).toHaveValue(expectedValue);
      });
    });

    it('should use wallet value when wallet value is less than button value', async () => {
      const buttonValue = toWei(150); // 150 CELO (more than wallet)

      renderAmountField({
        maxWalletValueWei: walletBalance,
        maxButtonValueWei: buttonValue,
      });

      const maxButton = screen.getByTestId('max-button');
      const amountInput = screen.getByTestId('amount-input');

      await fireEvent.click(maxButton);

      await waitFor(() => {
        // Should use wallet balance since it's smaller
        const expectedValueWei = walletBalance - MIN_REMAINING_BALANCE;
        const expectedValue = Number(expectedValueWei) / 1e18;
        expect(amountInput).toHaveValue(expectedValue);
      });
    });

    it('should use button value when wallet value is more than button value', async () => {
      const buttonValue = toWei(50); // 50 CELO (less than wallet)

      renderAmountField({
        maxWalletValueWei: walletBalance,
        maxButtonValueWei: buttonValue,
      });

      const maxButton = screen.getByTestId('max-button');
      const amountInput = screen.getByTestId('amount-input');

      await fireEvent.click(maxButton);

      await waitFor(() => {
        // Should use button value since it's smaller (no gas deduction on group capacity)
        const expectedValue = Number(buttonValue) / 1e18;
        expect(amountInput).toHaveValue(expectedValue);
      });
    });

    it('should use either value when wallet value equals button value', async () => {
      const buttonValue = walletBalance; // Equal values

      renderAmountField({
        maxWalletValueWei: walletBalance,
        maxButtonValueWei: buttonValue,
      });

      const maxButton = screen.getByTestId('max-button');
      const amountInput = screen.getByTestId('amount-input');

      await fireEvent.click(maxButton);

      await waitFor(() => {
        // Should use the value (both are equal)
        const expectedValueWei = walletBalance - MIN_REMAINING_BALANCE;
        const expectedValue = Number(expectedValueWei) / 1e18;
        expect(amountInput).toHaveValue(expectedValue);
      });
    });

    it('should handle non-CELO tokens without MIN_REMAINING_BALANCE deduction', async () => {
      const buttonValue = toWei(50);

      renderAmountField({
        maxWalletValueWei: walletBalance,
        maxButtonValueWei: buttonValue,
        tokenId: TokenId.cUSD,
      });

      const maxButton = screen.getByTestId('max-button');
      const amountInput = screen.getByTestId('amount-input');

      await fireEvent.click(maxButton);

      await waitFor(() => {
        // Should use button value without MIN_REMAINING_BALANCE deduction for non-CELO
        const expectedValue = Number(buttonValue) / 1e18;
        expect(amountInput).toHaveValue(expectedValue);
      });
    });

    it('should not execute onClickMax when disabled', async () => {
      const buttonValue = toWei(50);

      renderAmountField({
        maxWalletValueWei: walletBalance,
        maxButtonValueWei: buttonValue,
        disabled: true,
      });

      const maxButton = screen.getByTestId('max-button');
      const amountInput = screen.getByTestId('amount-input');

      await fireEvent.click(maxButton);

      // Value should remain unchanged
      expect(amountInput).toHaveValue(0);
    });

    it('should disable max button when maxButtonValue is 0', () => {
      renderAmountField({
        maxWalletValueWei: walletBalance,
        maxButtonValueWei: 0n,
      });

      const maxButton = screen.getByTestId('max-button');
      expect(maxButton).toBeDisabled();
    });

    it('should handle edge case where wallet balance is very small', async () => {
      const smallBalance = MIN_REMAINING_BALANCE / 2n; // Less than MIN_REMAINING_BALANCE

      renderAmountField({
        maxWalletValueWei: smallBalance,
        maxButtonValueWei: toWei(10),
      });

      const maxButton = screen.getByTestId('max-button');
      const amountInput = screen.getByTestId('amount-input');

      await fireEvent.click(maxButton);

      await waitFor(() => {
        // Should be 0 since wallet balance - MIN_REMAINING_BALANCE < 0
        expect(amountInput).toHaveValue(0);
      });
    });

    it('should display correct max description in UI', () => {
      renderAmountField({
        maxWalletValueWei: walletBalance,
        maxButtonValueWei: toWei(50),
      });

      // Check that the max description is displayed
      expect(screen.getByText(/CELO available/)).toBeInTheDocument();
    });

    it('should display gas fee warning when zeroBalanceMessage is provided and balance is insufficient', () => {
      const lowBalance = MIN_REMAINING_BALANCE / 2n;

      renderAmountField({
        maxWalletValueWei: lowBalance,
        tokenId: TokenId.CELO,
        zeroBalanceMessage: 'Not enough CELO to cover gas fees',
      });

      expect(screen.getByText('Not enough CELO to cover gas fees')).toBeInTheDocument();
    });

    it('should display custom zero balance message when provided', () => {
      renderAmountField({
        maxWalletValueWei: 0n,
        tokenId: TokenId.CELO,
        zeroBalanceMessage: 'No locked CELO available to stake',
      });

      expect(screen.getByText('No locked CELO available to stake')).toBeInTheDocument();
    });

    it('should show formatted balance when no zeroBalanceMessage is provided and balance is zero', () => {
      renderAmountField({
        maxWalletValueWei: 0n,
        tokenId: TokenId.CELO,
      });

      expect(screen.getByText(/0.*CELO available/)).toBeInTheDocument();
    });

    it('should disable input when maxWalletValue is 0 even if group has capacity', () => {
      renderAmountField({
        maxWalletValueWei: 0n,
        maxButtonValueWei: toWei(100),
        tokenId: TokenId.CELO,
      });

      const amountInput = screen.getByTestId('amount-input');
      const maxButton = screen.getByTestId('max-button');
      expect(amountInput).toBeDisabled();
      expect(maxButton).toBeDisabled();
    });
  });
});
