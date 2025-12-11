'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/contexts/Web3Provider';
import { formatAddress, formatBalance, parseAmount, getContract, QUSD_ABI, TREASURY_ABI } from '@/lib/web3';
import { Wallet, CheckCircle, ArrowRightLeft, Send, LogOut, QrCode, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import AnomalyBadge from '@/components/dashboard/AnomalyBadge';
import { reportAnomalyEvent, subscribeToAnomalyUpdates, getLastAnomalyResult, AnomalyResult } from '@/lib/anomaly';
import PrivacySettings from '@/components/dashboard/PrivacySettings';
import ReceiveModal from '@/components/dashboard/ReceiveModal';
import TransactionHistory from '@/components/dashboard/TransactionHistory';
import CurrencyConverter from '@/components/dashboard/CurrencyConverter';

type DetectionPayload = {
  wallet: string;
  action: 'swap' | 'send';
  amount: number;
  currency: string;
  txHash: string;
  targetCurrency?: string | null;
  recipient?: string | null;
};

const QUSD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS || '';
const TREASURY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS || '';

export default function DashboardPage() {
  const { provider, signer, account, isConnected, connectWallet, disconnectWallet } = useWeb3();
  const router = useRouter();
  
  const [qieBalance, setQieBalance] = useState<string>('0');
  const [qusdBalance, setQusdBalance] = useState<string>('0');
  const [isKycVerified, setIsKycVerified] = useState<boolean>(false);
  const [isLoadingKyc, setIsLoadingKyc] = useState(false);
  const [isLoadingSwap, setIsLoadingSwap] = useState(false);
  const [isLoadingSend, setIsLoadingSend] = useState(false);
  
  const [swapAmount, setSwapAmount] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [targetCurrency, setTargetCurrency] = useState('USD');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [lastAnomaly, setLastAnomaly] = useState<AnomalyResult | null>(null);
  const [isDetectingAnomaly, setIsDetectingAnomaly] = useState(false);
  const detectionQueue = useRef(0);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }
    loadBalances();
    loadKYCStatus();
  }, [isConnected, router, loadBalances, loadKYCStatus]);

  useEffect(() => {
    const stored = getLastAnomalyResult();
    if (stored) {
      setLastAnomaly(stored);
    }
    const unsubscribe = subscribeToAnomalyUpdates(() => {
      const latest = getLastAnomalyResult();
      if (latest) {
        setLastAnomaly(latest);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadBalances = useCallback(async () => {
    if (!provider || !account) return;

    try {
      // Load native QIE balance
      const balance = await provider.getBalance(account);
      setQieBalance(formatBalance(balance));

      // Load QUSD balance if contract address is set
      if (QUSD_CONTRACT_ADDRESS && signer) {
        const qusdContract = getContract(QUSD_CONTRACT_ADDRESS, QUSD_ABI, signer);
        const qusdBal = await qusdContract.balanceOf(account);
        setQusdBalance(formatBalance(qusdBal));
      }
    } catch (error: any) {
      console.error('Error loading balances:', error);
    }
  }, [provider, account, signer]);

  const loadKYCStatus = useCallback(async () => {
    if (!account) return;

    try {
      const response = await fetch(`/api/user?address=${account}`);
      const data = await response.json();
      
      if (data.isVerified !== undefined) {
        setIsKycVerified(data.isVerified);
      }
    } catch (error) {
      console.error('Error loading KYC status:', error);
    }
  }, [account]);

  const startAnomalyRun = () => {
    detectionQueue.current += 1;
    setIsDetectingAnomaly(true);
  };

  const finishAnomalyRun = () => {
    detectionQueue.current = Math.max(0, detectionQueue.current - 1);
    setIsDetectingAnomaly(detectionQueue.current > 0);
  };

  const triggerAnomalyCheck = async (payload: DetectionPayload) => {
    if (!payload.wallet || !payload.txHash) return;
    startAnomalyRun();
    try {
      const result = await reportAnomalyEvent(payload);
      setLastAnomaly(result);
      if (result.verdict === 'ANOMALY') {
        toast.error('Risk engine flagged this transaction as high risk. Inspect the reasons below.');
      } else if (result.verdict === 'SUSPICIOUS') {
        toast.warning('Risk engine marked this as suspicious. Please review before proceeding.');
      }
    } catch (error) {
      console.error('Anomaly check failed', error);
    } finally {
      finishAnomalyRun();
    }
  };

  const handleKYC = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsLoadingKyc(true);
    
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: account,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsKycVerified(true);
        toast.success('KYC verification completed!');
      } else {
        const errorMsg = data.error || 'Failed to update KYC status';
        const details = data.details || '';
        toast.error(`${errorMsg}${details ? ` - ${details}` : ''}`);
        console.error('KYC Error:', data);
      }
    } catch (error: any) {
      console.error('Error in KYC:', error);
      toast.error(error.message || 'Failed to complete KYC');
    } finally {
      setIsLoadingKyc(false);
    }
  };

  const handleSwap = async () => {
    if (!signer || !account) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!TREASURY_CONTRACT_ADDRESS) {
      toast.error('Treasury contract address not configured');
      return;
    }

    const numericSwapAmount = parseFloat(swapAmount);
    if (!swapAmount || numericSwapAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoadingSwap(true);

    try {
      const treasuryContract = getContract(TREASURY_CONTRACT_ADDRESS, TREASURY_ABI, signer);
      const amount = parseAmount(swapAmount);
      
      // Show immediate feedback for hackathon
      toast.loading('Swapping QIE for QUSD...', { id: 'swap' });
      
      const tx = await treasuryContract.depositNativeForStable({
        value: amount,
      });

      toast.loading('Transaction pending...', { id: 'swap' });
      await tx.wait();
      
      toast.success('Successfully swapped QIE for QUSD!', { id: 'swap' });
      setSwapAmount('');
      await loadBalances();
      void triggerAnomalyCheck({
        wallet: account,
        action: 'swap',
        amount: numericSwapAmount,
        currency: 'QIE',
        txHash: tx.hash,
      });
    } catch (error: any) {
      console.error('Error swapping:', error);
      toast.error(error.message || 'Failed to swap tokens', { id: 'swap' });
    } finally {
      setIsLoadingSwap(false);
    }
  };

  const handleSend = async () => {
    if (!signer || !account) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!TREASURY_CONTRACT_ADDRESS) {
      toast.error('Treasury contract address not configured');
      return;
    }

    const numericSendAmount = parseFloat(sendAmount);
    if (!sendAmount || numericSendAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
      toast.error('Please enter a valid recipient address');
      return;
    }

    setIsLoadingSend(true);

    try {
      const treasuryContract = getContract(TREASURY_CONTRACT_ADDRESS, TREASURY_ABI, signer);
      const amount = parseAmount(sendAmount);
      
      toast.loading('Processing cross-border transfer...', { id: 'send' });
      
      const tx = await treasuryContract.executeCrossBorderTransfer(
        recipientAddress,
        amount,
        targetCurrency
      );

      toast.loading('Transaction pending...', { id: 'send' });
      await tx.wait();
      
      toast.success(`Transfer initiated! ${sendAmount} QUSD to ${targetCurrency}`, { id: 'send' });
      setSendAmount('');
      setRecipientAddress('');
      await loadBalances();
      void triggerAnomalyCheck({
        wallet: account,
        action: 'send',
        amount: numericSendAmount,
        currency: 'QUSD',
        txHash: tx.hash,
        targetCurrency,
        recipient: recipientAddress,
      });
    } catch (error: any) {
      console.error('Error sending:', error);
      toast.error(error.message || 'Failed to send transfer', { id: 'send' });
    } finally {
      setIsLoadingSend(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                QieRemit Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-mono">{formatAddress(account || '')}</span>
              </div>
              <Link
                href="/dashboard/admin"
                className="px-3 py-1 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-cyan-400 transition-colors"
              >
                Admin Alerts
              </Link>
              <button
                onClick={disconnectWallet}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Disconnect"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="backdrop-blur-sm bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">Native QIE Balance</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{qieBalance}</p>
            <p className="text-slate-500 text-sm mt-2 mb-4">QIE</p>
            <button
              onClick={() => setShowReceiveModal(true)}
              className="w-full px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-blue-400"
            >
              <QrCode className="w-4 h-4" />
              Receive
            </button>
          </div>

          <div className="backdrop-blur-sm bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 text-sm font-medium">QUSD Balance</h3>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{qusdBalance}</p>
            <p className="text-slate-500 text-sm mt-2 mb-4">QUSD Stablecoin</p>
            <button
              onClick={() => setShowReceiveModal(true)}
              className="w-full px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-cyan-400"
            >
              <QrCode className="w-4 h-4" />
              Receive
            </button>
          </div>
        </div>

        {/* Currency Converter & Transaction History Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <CurrencyConverter />
          </div>
          <div className="lg:col-span-2">
            <TransactionHistory />
          </div>
        </div>

        {/* KYC Section */}
        <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">KYC Verification</h3>
              {isKycVerified && (
                <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Verified</span>
                </div>
              )}
            </div>
            <button
              onClick={handleKYC}
              disabled={isLoadingKyc || isKycVerified}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isLoadingKyc ? 'Processing...' : isKycVerified ? 'Already Verified' : 'KYC Me'}
            </button>
          </div>
        </div>

        {/* Swap Section */}
        <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold">Swap QIE for QUSD</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Amount (QIE)</label>
              <input
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
              />
            </div>
            <button
              onClick={handleSwap}
              disabled={isLoadingSwap || !swapAmount}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
            >
              {isLoadingSwap ? 'Swapping...' : 'Swap QIE → QUSD'}
            </button>
          </div>
        </div>

        {/* Send Globally Section */}
        <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Send className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold">Send Globally</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Amount (QUSD)</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Target Currency</label>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={isLoadingSend || !sendAmount || !recipientAddress}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
            >
              {isLoadingSend ? 'Processing...' : 'Execute Transfer'}
            </button>
          </div>
        </div>

        {/* Risk Monitor */}
        <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">Real-time Risk Monitor</p>
              <p className="text-sm text-slate-400">
                {isDetectingAnomaly
                  ? 'Analyzing the latest transaction...'
                  : lastAnomaly
                  ? `Last verdict: ${lastAnomaly.verdict}`
                  : 'Submit a swap or transfer to trigger the risk engine.'}
              </p>
            </div>
            {lastAnomaly ? (
              <AnomalyBadge verdict={lastAnomaly.verdict} showScore={lastAnomaly.score} />
            ) : (
              <span className="text-xs uppercase text-slate-500">idle</span>
            )}
          </div>
          <div className="mt-4">
            {isDetectingAnomaly ? (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                Processing anomaly signals...
              </div>
            ) : lastAnomaly ? (
              <p className="text-sm text-slate-400">
                {lastAnomaly.verdict === 'ANOMALY'
                  ? 'Confirmed risky behavior. Review the reasons below before proceeding.'
                  : 'Suspicious activity detected. Proceed with caution.'}
              </p>
            ) : (
              <p className="text-sm text-slate-400">No anomalies traced yet.</p>
            )}

            {lastAnomaly?.reasons?.length ? (
              <ul className="mt-3 grid gap-2 text-xs text-slate-300">
                {lastAnomaly.reasons.map((reason, index) => (
                  <li
                    key={`${reason}-${index}`}
                    className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {/* Privacy Settings Section */}
        <div className="mt-6">
          <PrivacySettings />
        </div>
      </main>

      {/* Receive Modal */}
      <ReceiveModal isOpen={showReceiveModal} onClose={() => setShowReceiveModal(false)} />
    </div>
  );
}

