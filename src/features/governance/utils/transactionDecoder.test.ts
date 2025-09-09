import { describe, expect, it } from 'vitest';
import {
  decodeTransaction,
  formatTransactionArgs,
  getContractName,
  ProposalTransaction,
} from './transactionDecoder';

describe('transactionDecoder', () => {
  describe('getContractName', () => {
    it('should return correct contract name for known addresses', () => {
      expect(getContractName('0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972')).toBe('Governance');
      expect(getContractName('0x471ece3750da237f93b8e339c536989b8978a438')).toBe('CELO');
      expect(getContractName('0x765de816845861e75a25fca122bb6898b8b1282a')).toBe('cUSD');
    });

    it('should return Unknown Contract for unknown addresses', () => {
      expect(getContractName('0x1234567890123456789012345678901234567890')).toBe(
        'Unknown Contract',
      );
    });
  });

  describe('formatTransactionArgs', () => {
    it('should format transaction arguments correctly', () => {
      const args = {
        amount: 1000n,
        to: '0x1234567890123456789012345678901234567890',
        value: 'test',
      };

      const result = formatTransactionArgs(args);
      expect(result).toContain('amount: 1000');
      expect(result).toContain('to: 0x1234567890123456789012345678901234567890');
      expect(result).toContain('value: test');
    });
  });

  describe('decodeTransaction', () => {
    it('should handle empty transaction data', () => {
      const transaction: ProposalTransaction = {
        index: 0,
        to: '0x1234567890123456789012345678901234567890',
        value: 0n,
        data: '0x',
      };

      const result = decodeTransaction(transaction);
      expect(result).toBeNull();
    });

    it('should decode common function selectors', () => {
      const transaction: ProposalTransaction = {
        index: 0,
        to: '0x1234567890123456789012345678901234567890',
        value: 0n,
        data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a',
      };

      const result = decodeTransaction(transaction);
      expect(result).not.toBeNull();
      expect(result?.functionName).toBe('transfer');
      expect(result?.description).toBe('Transfer tokens');
    });
  });
});
