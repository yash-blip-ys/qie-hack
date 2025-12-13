'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowRightLeft, ExternalLink, Loader2, RefreshCcw } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { toast } from 'react-hot-toast';
import { getExplorerUrl } from '@/config';
import AnomalyBadge from '@/components/dashboard/AnomalyBadge';
import { getAnomalyStore, subscribeToAnomalyUpdates } from '@/lib/anomaly';

const PAGE_SIZE = 6;

type TransferType = 'cross-border' | 'swap';
type TransferStatus = 'pending' | 'completed' | 'failed';

interface Transfer {
  txHash: string;
  type: TransferType;
  amountQUSD: string;
  timestamp: number;
  status: TransferStatus;
  targetCurrency?: string | null;
  recipient?: string | null;
}

export default function TransactionHistory() {
  const { account } = useWeb3();
  const [transactions, setTransactions] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [anomalyMap, setAnomalyMap] = useState(() => getAnomalyStore());

  const fetchTransactions = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!account) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          address: account,
          page: pageToLoad.toString(),
          limit: PAGE_SIZE.toString(),
        });
        const response = await fetch(`/api/transfers?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to load transactions');
        }
        const payload = await response.json();
        const newData: Transfer[] = payload.data.map((item: any) => ({
          txHash: item.txHash,
          type: item.type,
          amountQUSD: item.amountQUSD,
          timestamp: item.timestamp,
          status: item.status,
          targetCurrency: item.targetCurrency,
          recipient: item.recipient,
        }));
        setTransactions((prev) => (append ? [...prev, ...newData] : newData));
        setHasMore(pageToLoad < payload.pagination.pages);
        setPage(pageToLoad);
      } catch (error: any) {
        console.error('Error loading transactions:', error);
        toast.error(error.message || 'Unable to load history');
      } finally {
        setIsLoading(false);
      }
    },
    [account]
  );

  useEffect(() => {
    if (!account) {
      setTransactions([]);
      return;
    }
    fetchTransactions(1, false);
  }, [account, fetchTransactions]);

  useEffect(() => {
    const refresh = () => setAnomalyMap(getAnomalyStore());
    const unsubscribe = subscribeToAnomalyUpdates(refresh);
    return () => unsubscribe();
  }, []);

  const handleLoadMore = () => {
    if (!hasMore || isLoading) return;
    fetchTransactions(page + 1, true);
  };

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/transfers', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to sync on-chain events');
      }
      toast.success('Ledger synced with on-chain events');
      await fetchTransactions(1, false);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const getTransactionIcon = (type: TransferType) => {
    switch (type) {
      case 'cross-border':
        return <ArrowUp className="w-5 h-5 text-red-600" />;
      case 'swap':
        return <ArrowRightLeft className="w-5 h-5 text-blue-600" />;
      default:
        return <ArrowDown className="w-5 h-5 text-gray-400" />;
    }
  };

  const getTransactionLabel = (tx: Transfer) => {
    if (tx.type === 'cross-border') {
      return tx.targetCurrency
        ? `Cross-border payout (${tx.targetCurrency})`
        : 'Cross-border payout';
    }
    return 'Swap QIE → QUSD';
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const explorerBase = getExplorerUrl();
  const getExplorerLink = (txHash: string) => {
    return `${explorerBase.replace(/\/$/, '')}/tx/${txHash}`;
  };

  const statusBadge = (status: TransferStatus) => {
    const common = 'px-2 py-0.5 rounded-full text-xs font-semibold';
    switch (status) {
      case 'completed':
        return <span className={`${common} bg-green-50 text-green-700 border border-green-200`}>Completed</span>;
      case 'failed':
        return <span className={`${common} bg-red-50 text-red-700 border border-red-200`}>Failed</span>;
      default:
        return <span className={`${common} bg-yellow-50 text-yellow-700 border border-yellow-200`}>Pending</span>;
    }
  };

  return (
    <div className="card-elevated rounded-2xl p-6 border border-gray-200 bg-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your recent activity</p>
        </div>
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl text-sm text-gray-700 font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync now
        </button>
      </div>
      
      {isLoading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
          <span className="ml-3 text-gray-600">Loading transactions...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRightLeft className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">No transactions found</p>
          <p className="text-gray-500 text-sm mt-2">Your transaction history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx, index) => {
            const anomalyEntry = anomalyMap[tx.txHash];
            return (
              <div
                key={`${tx.txHash}-${index}`}
                className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                <div className="flex-shrink-0">
                  {getTransactionIcon(tx.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                      {getTransactionLabel(tx)}
                      {statusBadge(tx.status)}
                      {anomalyEntry && (
                        <span className="flex items-center">
                          <AnomalyBadge
                            verdict={anomalyEntry.verdict}
                            size="sm"
                            showScore={anomalyEntry.score}
                          />
                        </span>
                      )}
                    </p>
                    <p
                      className={`font-bold ${
                        tx.type === 'swap' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'swap' ? '+' : '-'}
                      {tx.amountQUSD} QUSD
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatDate(tx.timestamp)}</span>
                    {tx.recipient && (
                      <>
                        <span>•</span>
                        <span className="font-mono">
                          {tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={getExplorerLink(tx.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="w-full mt-2 py-2 border-2 border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors font-semibold"
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

