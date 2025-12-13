'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/contexts/Web3Provider';
import { formatAddress, formatBalance, parseAmount, getContract, QUSD_ABI, TREASURY_ABI } from '@/lib/web3';
import { Wallet, CheckCircle, ArrowRightLeft, Send, LogOut, QrCode, Loader2, Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  QieRemit Dashboard
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">Financial Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-mono text-gray-700">{formatAddress(account || '')}</span>
              </div>
              <Link
                href="/dashboard/admin"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium"
              >
                Admin Alerts
              </Link>
              <button
                onClick={disconnectWallet}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
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
          <div className="card-elevated rounded-2xl p-6 border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">Native QIE Balance</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{qieBalance}</p>
            <p className="text-gray-500 text-sm mb-6 font-medium">QIE Native Token</p>
            <button
              onClick={() => setShowReceiveModal(true)}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <QrCode className="w-4 h-4" />
              Receive Funds
            </button>
          </div>

          <div className="card-elevated rounded-2xl p-6 border border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">QUSD Balance</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{qusdBalance}</p>
            <p className="text-gray-500 text-sm mb-6 font-medium">QUSD Stablecoin</p>
            <button
              onClick={() => setShowReceiveModal(true)}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              <QrCode className="w-4 h-4" />
              Receive Funds
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
        <div className="card-elevated rounded-2xl p-6 mb-6 border border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">KYC Verification</h3>
                <p className="text-sm text-gray-500">Verify your identity to unlock full features</p>
              </div>
              {isKycVerified && (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-semibold">Verified</span>
                </div>
              )}
            </div>
            <button
              onClick={handleKYC}
              disabled={isLoadingKyc || isKycVerified}
              className="px-6 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:shadow-none"
            >
              {isLoadingKyc ? 'Processing...' : isKycVerified ? 'Verified' : 'Verify Identity'}
            </button>
          </div>
        </div>

        {/* Swap Section */}
        <div className="card-elevated rounded-2xl p-6 mb-6 border border-gray-200 bg-white">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Swap QIE for QUSD</h3>
              <p className="text-sm text-gray-500">Exchange your native tokens instantly</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 font-semibold mb-2">Amount (QIE)</label>
              <input
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all"
              />
            </div>
            <button
              onClick={handleSwap}
              disabled={isLoadingSwap || !swapAmount}
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:shadow-none"
            >
              {isLoadingSwap ? 'Swapping...' : 'Swap QIE → QUSD'}
            </button>
          </div>
        </div>

        {/* Send Globally Section */}
        <div className="card-elevated rounded-2xl p-6 border border-gray-200 bg-white">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Send Globally</h3>
              <p className="text-sm text-gray-500">Cross-border transfers made simple</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 font-semibold mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 font-mono text-sm transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 font-semibold mb-2">Amount (QUSD)</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 font-medium transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 font-semibold mb-2">Target Currency</label>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 font-medium transition-all"
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
              className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md disabled:shadow-none"
            >
              {isLoadingSend ? 'Processing...' : 'Execute Transfer'}
            </button>
          </div>
        </div>

        {/* Risk Monitor */}
        <div className="card-elevated rounded-2xl p-6 mb-6 border border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Real-time Risk Monitor</p>
                <p className="text-sm text-gray-600">
                  {isDetectingAnomaly
                    ? 'Analyzing the latest transaction...'
                    : lastAnomaly
                    ? `Last verdict: ${lastAnomaly.verdict}`
                    : 'Submit a swap or transfer to trigger the risk engine.'}
                </p>
              </div>
            </div>
            {lastAnomaly ? (
              <AnomalyBadge verdict={lastAnomaly.verdict} showScore={lastAnomaly.score} />
            ) : (
              <span className="text-xs uppercase text-gray-400 font-semibold">idle</span>
            )}
          </div>
          <div className="mt-4">
            {isDetectingAnomaly ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                Processing anomaly signals...
              </div>
            ) : lastAnomaly ? (
              <p className="text-sm text-gray-600">
                {lastAnomaly.verdict === 'ANOMALY'
                  ? 'Confirmed risky behavior. Review the reasons below before proceeding.'
                  : 'Suspicious activity detected. Proceed with caution.'}
              </p>
            ) : (
              <p className="text-sm text-gray-500">No anomalies traced yet.</p>
            )}

            {lastAnomaly?.reasons?.length ? (
              <ul className="mt-3 grid gap-2 text-xs">
                {lastAnomaly.reasons.map((reason, index) => (
                  <li
                    key={`${reason}-${index}`}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700"
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

