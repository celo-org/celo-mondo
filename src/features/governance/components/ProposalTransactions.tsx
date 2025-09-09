'use client';

import { useState, useEffect } from 'react';
import { FullWidthSpinner } from 'src/components/animation/Spinner';
import { CollapsibleSection } from 'src/components/layout/CollapsibleSection';
import { formatTransactionArgs, getContractName } from 'src/features/governance/utils/transactionDecoder';
import { ProposalTransaction, DecodedTransaction } from 'src/features/governance/utils/transactionDecoder';

interface ProposalTransactionsProps {
  proposalId: string;
}

interface TransactionResponse {
  proposalId: number;
  transactions: (ProposalTransaction & { decoded?: DecodedTransaction })[];
}

export function ProposalTransactions({ proposalId }: ProposalTransactionsProps) {
  const [transactions, setTransactions] = useState<TransactionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);
        const response = await fetch(`/governance/${proposalId}/api/transactions`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch transactions: ${response.statusText}`);
        }
        
        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [proposalId]);

  if (loading) {
    return <FullWidthSpinner>Loading proposal transactions</FullWidthSpinner>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800">Error loading transactions: {error}</p>
      </div>
    );
  }

  if (!transactions || transactions.transactions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-gray-600">No transactions found for this proposal.</p>
      </div>
    );
  }

  return (
    <CollapsibleSection title={`Transactions (${transactions.transactions.length})`}>
      <div className="space-y-4">
        {transactions.transactions.map((transaction, index) => (
          <TransactionCard
            key={index}
            transaction={transaction}
            index={index}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}

interface TransactionCardProps {
  transaction: ProposalTransaction & { decoded?: DecodedTransaction };
  index: number;
}

function TransactionCard({ transaction, index }: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (transaction.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-red-800">Transaction {index + 1}</h4>
          <span className="text-sm text-red-600">Error</span>
        </div>
        <p className="mt-2 text-sm text-red-700">{transaction.error}</p>
      </div>
    );
  }

  const contractName = getContractName(transaction.to);
  const hasValue = transaction.value > 0n;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-800">
            {index + 1}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {transaction.decoded?.functionName || 'Unknown Function'}
            </h4>
            <p className="text-sm text-gray-600">
              {contractName} • {transaction.to}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {transaction.decoded?.description && (
        <p className="mt-2 text-sm text-gray-700">
          {transaction.decoded.description}
        </p>
      )}

      {hasValue && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">Value:</span> {transaction.decoded?.value || '0'} CELO
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
          <div>
            <h5 className="text-sm font-medium text-gray-900">Contract Details</h5>
            <div className="mt-1 text-sm text-gray-600">
              <p><span className="font-medium">Address:</span> {transaction.to}</p>
              <p><span className="font-medium">Name:</span> {contractName}</p>
            </div>
          </div>

          {transaction.decoded?.args && Object.keys(transaction.decoded.args).length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900">Function Arguments</h5>
              <div className="mt-1 text-sm text-gray-600">
                <p>{formatTransactionArgs(transaction.decoded.args)}</p>
              </div>
            </div>
          )}

          <div>
            <h5 className="text-sm font-medium text-gray-900">Raw Data</h5>
            <div className="mt-1">
              <code className="block rounded bg-gray-100 p-2 text-xs text-gray-800 break-all">
                {transaction.data}
              </code>
            </div>
          </div>

          {hasValue && (
            <div>
              <h5 className="text-sm font-medium text-gray-900">Value</h5>
              <div className="mt-1 text-sm text-gray-600">
                <p>{transaction.decoded?.value || '0'} CELO</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
