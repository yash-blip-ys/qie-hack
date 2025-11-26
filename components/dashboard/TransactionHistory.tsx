'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, ArrowRightLeft, ExternalLink, Loader2, RefreshCcw } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { toast } from 'react-hot-toast';

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

  useEffect(() => {
    if (!account) {
      setTransactions([]);
      return;
    }
    fetchTransactions(1, false);
  }, [account]);

  const fetchTransactions = async (pageToLoad: number, append: boolean) => {
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
  };

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
        return <ArrowUp className="w-5 h-5 text-red-400" />;
      case 'swap':
        return <ArrowRightLeft className="w-5 h-5 text-cyan-400" />;
      default:
        return <ArrowDown className="w-5 h-5 text-slate-400" />;
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

  const getExplorerLink = (txHash: string) => {
    return `https://explorer.qie.org/tx/${txHash}`;
  };

  const statusBadge = (status: TransferStatus) => {
    const common = 'px-2 py-0.5 rounded-full text-xs font-semibold';
    switch (status) {
      case 'completed':
        return <span className={`${common} bg-emerald-500/20 text-emerald-400`}>Completed</span>;
      case 'failed':
        return <span className={`${common} bg-red-500/20 text-red-400`}>Failed</span>;
      default:
        return <span className={`${common} bg-yellow-500/20 text-yellow-400`}>Pending</span>;
    }
  };

  return (
    <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Transaction History</h3>
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync now
        </button>
      </div>
      
      {isLoading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="ml-3 text-slate-400">Loading transactions...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRightLeft className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-400">No transactions found</p>
          <p className="text-slate-500 text-sm mt-2">Your transaction history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx, index) => (
            <div
              key={`${tx.txHash}-${index}`}
              className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="flex-shrink-0">
                {getTransactionIcon(tx.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-white flex items-center gap-2">
                    {getTransactionLabel(tx)}
                    {statusBadge(tx.status)}
                  </p>
                  <p
                    className={`font-semibold ${
                      tx.type === 'swap' ? 'text-cyan-400' : 'text-red-400'
                    }`}
                  >
                    {tx.type === 'swap' ? '+' : '-'}
                    {tx.amountQUSD} QUSD
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
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
                className="flex-shrink-0 p-2 hover:bg-slate-700 rounded-lg transition-colors"
                title="View on Explorer"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </a>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="w-full mt-2 py-2 border border-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

