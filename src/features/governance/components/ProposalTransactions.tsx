'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { CollapsibleSection } from 'src/components/layout/CollapsibleSection';
import {
  DecodedTransaction,
  getContractName,
  ProposalTransaction,
} from 'src/features/governance/utils/transactionDecoder';

interface ProposalTransactionsProps {
  proposalId: string;
  numTransactions: bigint | undefined;
}

type TransactionResponse = (ProposalTransaction & { decoded: DecodedTransaction })[];

export function ProposalTransactions({ proposalId, numTransactions }: ProposalTransactionsProps) {
  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: [numTransactions, proposalId],
    queryFn: async () => {
      if (!numTransactions) {
        return [];
      }

      const response = await fetch(`/governance/${proposalId}/api/transactions?decoded=true`);
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      return (await response.json()) as TransactionResponse;
    },
  });

  return (
    <CollapsibleSection title={`Onchain Transactions (${numTransactions})`}>
      {numTransactions === 0n ? null : (
        <div className="space-y-4">
          {isLoading ? (
            <FullWidthSpinner>Loading proposal onchain transactions</FullWidthSpinner>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-red-800">Error loading transactions: {error.message}</p>
            </div>
          ) : (
            transactions?.map((transaction, index) => (
              <TransactionCard key={index} transaction={transaction} index={index} />
            ))
          )}
        </div>
      )}
    </CollapsibleSection>
  );
}

interface TransactionCardProps {
  transaction: ProposalTransaction & { decoded: DecodedTransaction };
  index: number;
}

function TransactionCard({ transaction, index }: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { decoded, error, to, value, data } = transaction;
  if (transaction.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-red-800">Transaction {index + 1}</h4>
          <span className="text-sm text-red-600">Error</span>
        </div>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const contractName = getContractName(to);
  const hasValue = value > 0n;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-800">
            {index + 1}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {decoded.functionName || 'Unknown Function'}
            </h4>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {decoded.description && <p className="mt-2 text-sm text-gray-700">{decoded.description}</p>}

      {hasValue && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Value:</span> {decoded.value || '0'} CELO
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
          <div>
            <h5 className="text-sm font-medium text-gray-900">Contract Details</h5>
            <div className="mt-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Address:</span> {to}
              </p>
              <p>
                <span className="font-medium">Name:</span> {contractName}
              </p>
            </div>
          </div>

          {decoded.args && Object.keys(decoded.args).length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900">Function Arguments</h5>
              <div className="mt-1 font-mono text-sm text-gray-600">
                {Object.entries(decoded.args).map(([key, value]) => (
                  <p key={key}>
                    {key}: {value}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <h5 className="text-sm font-medium text-gray-900">Raw Data</h5>
            <div className="mt-1">
              <code className="block break-all rounded bg-gray-100 p-2 text-xs text-gray-800">
                {data}
              </code>
            </div>
          </div>

          {hasValue && (
            <div>
              <h5 className="text-sm font-medium text-gray-900">Value</h5>
              <div className="mt-1 text-sm text-gray-600">
                <p>{decoded.value || '0'} CELO</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
