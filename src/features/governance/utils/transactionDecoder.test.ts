import { describe, expect, it } from 'vitest';
import { decodeTransaction, getContractName, ProposalTransaction } from './transactionDecoder';

describe('transactionDecoder', () => {
  describe('getContractName', () => {
    it('should return correct contract name for known addresses', () => {
      expect(getContractName('0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972')).toBe('Governance');
      expect(getContractName('0x471ece3750da237f93b8e339c536989b8978a438')).toBe('CELO');
      expect(getContractName('0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e')).toBe('Tether USD');
    });

    it('should return Unknown Contract for unknown addresses', () => {
      expect(getContractName('0x1234567890123456789012345678901234567890')).toBe(
        'Unknown Contract',
      );
    });
  });
  describe('decodeTransaction', () => {
    it('should handle empty transaction data', async () => {
      const transaction: ProposalTransaction = {
        index: 0,
        to: '0x1234567890123456789012345678901234567890',
        value: 0n,
        data: '0x',
      };

      const result = await decodeTransaction(transaction);
      expect(result).not.toBeNull();
      expect(result.functionName).toBe('native transfer');
    });

    it('should decode common function selectors', async () => {
      const transaction: ProposalTransaction = {
        index: 0,
        to: '0x1234567890123456789012345678901234567890',
        value: 0n,
        data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a',
      };

      const result = await decodeTransaction(transaction);
      expect(result).not.toBeNull();
      expect(result.functionName).toBe('transfer');
      expect(result.description).toMatch(/Transfer tokens/);
    });
  });
});
