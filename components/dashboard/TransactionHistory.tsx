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

export default function TransactionHistory({ limit }: { limit?: number }) {
  const { account } = useWeb3();
  const [transactions, setTransactions] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [anomalyMap, setAnomalyMap] = useState(() => getAnomalyStore());

  const fetchTransactions = useCallback(
    async (pageToLoad: number, append: boolean) => {
      if (!account) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          address: account,
          page: pageToLoad.toString(),
          limit: (limit || PAGE_SIZE).toString(),
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
      } catch (error: any) {
        console.error('Error loading transactions:', error);
        toast.error(error.message || 'Unable to load history');
      } finally {
        setIsLoading(false);
      }
    },
    [account, limit]
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
        return <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20"><ArrowUp className="w-4 h-4 text-red-400" /></div>;
      case 'swap':
        return <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20"><ArrowRightLeft className="w-4 h-4 text-cyan-400" /></div>;
      default:
        return <div className="p-2 rounded-lg bg-gray-500/10 border border-gray-500/20"><ArrowDown className="w-4 h-4 text-gray-400" /></div>;
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

  const statusBadge = (status: TransferStatus) => {
    const common = 'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider';
    switch (status) {
      case 'completed':
        return <span className={`${common} bg-green-500/10 text-green-400 border border-green-500/20`}>Success</span>;
      case 'failed':
        return <span className={`${common} bg-red-500/10 text-red-400 border border-red-500/20`}>Failed</span>;
      default:
        return <span className={`${common} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`}>Pending</span>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-400">Your recent activity</p>
        <button
          onClick={syncNow}
          disabled={isSyncing}
          className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          title="Sync Transactions"
        >
          <RefreshCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {isLoading && transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8">
          <Loader2 className="w-6 h-6 text-cyan-500 animate-spin mb-2" />
          <span className="text-sm text-gray-500">Loading history...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
          <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mb-3">
            <ArrowRightLeft className="w-5 h-5 text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm font-medium">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
          {transactions.map((tx, index) => {
            const anomalyEntry = anomalyMap[tx.txHash];
            return (
              <div
                key={`${tx.txHash}-${index}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300"
              >
                {getTransactionIcon(tx.type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium text-gray-200 truncate pr-2">
                      {getTransactionLabel(tx)}
                    </p>
                    <span className="text-sm font-bold text-white font-mono whitespace-nowrap">
                      {tx.amountQUSD} QUSD
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusBadge(tx.status)}
                      {anomalyEntry && (
                        <AnomalyBadge verdict={anomalyEntry.verdict} showScore={anomalyEntry.score} size="sm" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(tx.timestamp * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
