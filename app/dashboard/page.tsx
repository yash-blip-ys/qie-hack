'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/contexts/Web3Provider';
import { formatAddress, formatBalance, parseAmount, getContract, QUSD_ABI, TREASURY_ABI, ORACLE_ABI } from '@/lib/web3';
import { Wallet, CheckCircle, ArrowRightLeft, Send, LogOut, QrCode, Loader2, Shield, RefreshCw, Copy, ExternalLink, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { reportAnomalyEvent, subscribeToAnomalyUpdates, getLastAnomalyResult, AnomalyResult } from '@/lib/anomaly';
import ReceiveModal from '@/components/dashboard/ReceiveModal';
import UserSecurityStatus from '@/components/dashboard/UserSecurityStatus';
import KYCVerification from '@/components/dashboard/KYCVerification';
import CurrencyConverter from '@/components/dashboard/CurrencyConverter';
import PriceTicker from '@/components/dashboard/PriceTicker';
import PrivacySettings from '@/components/dashboard/PrivacySettings';
import Chatbot from './chatbot/chatbot';

const QUSD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS || '';
const TREASURY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS || '';
const EXPLORER_URL = process.env.QIE_EXPLORER_URL || 'https://mainnet.qie.digital';

export default function DashboardPage() {
  const { provider, signer, account, isConnected, connectWallet, disconnectWallet, switchNetwork } = useWeb3();
  const router = useRouter();
  
  const [qieBalance, setQieBalance] = useState<string>('0');
  const [qusdBalance, setQusdBalance] = useState<string>('0');
  const [qusdDecimals, setQusdDecimals] = useState<number>(18);
  const [isKycVerified, setIsKycVerified] = useState<boolean>(false);
  const [isLoadingSwap, setIsLoadingSwap] = useState(false);
  const [isLoadingSend, setIsLoadingSend] = useState(false);
  const [oraclePrice, setOraclePrice] = useState<number>(1.0);
  
  const [activeTab, setActiveTab] = useState<'swap' | 'send'>('swap');
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
        const dec = await qusdContract.decimals();
        setQusdDecimals(Number(dec));
        const qusdBal = await qusdContract.balanceOf(account);
        setQusdBalance(formatBalance(qusdBal, Number(dec)));
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

    const verifyNetworkAndLoad = async () => {
      if (provider && switchNetwork) {
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== 1990) {
          toast.loading('Switching to QIE Mainnet...', { duration: 3000 });
          await switchNetwork(1990);
        } else {
          loadBalances();
          loadKYCStatus();
          try {
            const oracleAddr = process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS || '';
            if (oracleAddr && signer) {
              const oracle = getContract(oracleAddr, ORACLE_ABI, signer);
              const priceRaw = await oracle.getPrice();
              const price = Number(formatBalance(priceRaw)); // price is 18-decimal fixed
              if (!Number.isNaN(price) && price > 0) {
                setOraclePrice(price);
              }
            }
          } catch {}
        }
      }
    };

    verifyNetworkAndLoad();
  }, [isConnected, router, provider, switchNetwork, loadBalances, loadKYCStatus, signer]);

  useEffect(() => {
    const stored = getLastAnomalyResult();
    if (stored) {
      setLastAnomaly(stored);
    }
    const unsubscribe = subscribeToAnomalyUpdates(() => {
      const latest = getLastAnomalyResult();
      setLastAnomaly(latest);
      if (detectionQueue.current > 0) {
        detectionQueue.current--;
        if (detectionQueue.current === 0) {
          setIsDetectingAnomaly(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied!');
    }
  };

  const handleSwap = async () => {
    if (!isKycVerified) {
      toast.error('Please complete KYC before transacting');
      return;
    }
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    
    setIsLoadingSwap(true);
    setIsDetectingAnomaly(true);
    detectionQueue.current++;

    try {
      // Report anomaly first (optimistic)
      reportAnomalyEvent({
        wallet: account || '',
        action: 'swap',
        amount: parseFloat(swapAmount),
        currency: 'QIE'
      });

      if (!signer) throw new Error('Wallet not connected');

      const treasuryContract = getContract(TREASURY_CONTRACT_ADDRESS, TREASURY_ABI, signer);
      const amountWei = parseAmount(swapAmount);

      const tx = await treasuryContract.depositNativeForStable({
        value: amountWei
      });
      
      toast.loading('Swapping QIE to QUSD...', { id: 'swap-toast' });
      await tx.wait();
      await fetch('/api/transfers', { method: 'POST' });
      toast.success('Swap successful!', { id: 'swap-toast' });
      
      setSwapAmount('');
      loadBalances();
    } catch (error: any) {
      console.error('Swap error:', error);
      toast.error(error.message || 'Swap failed', { id: 'swap-toast' });
      setIsDetectingAnomaly(false);
    } finally {
      setIsLoadingSwap(false);
    }
  };

  const handleSend = async () => {
    if (!isKycVerified) {
      toast.error('Please complete KYC before transacting');
      return;
    }
    if (!sendAmount || !recipientAddress) {
      toast.error('Please fill all fields');
      return;
    }

    setIsLoadingSend(true);
    setIsDetectingAnomaly(true);
    detectionQueue.current++;

    try {
      reportAnomalyEvent({
        wallet: account || '',
        action: 'send',
        amount: parseFloat(sendAmount),
        currency: 'QUSD',
        recipient: recipientAddress,
        targetCurrency: targetCurrency
      });

      if (!signer) throw new Error('Wallet not connected');

      const treasuryContract = getContract(TREASURY_CONTRACT_ADDRESS, TREASURY_ABI, signer);
      const qusdContract = getContract(QUSD_CONTRACT_ADDRESS, QUSD_ABI, signer);

      const amountWei = parseAmount(sendAmount, qusdDecimals);
      
      // Standard ERC20 approve
      const approveTx = await qusdContract.approve(TREASURY_CONTRACT_ADDRESS, amountWei);
      toast.loading('Approving QUSD...', { id: 'send-toast' });
      await approveTx.wait();

      // Execute Cross Border Transfer
      const tx = await treasuryContract.executeCrossBorderTransfer(
        recipientAddress,
        amountWei,
        targetCurrency
      );

      toast.loading('Processing Transfer...', { id: 'send-toast' });
      const receipt = await tx.wait();
      await fetch('/api/transfers', { method: 'POST' });
      const txHash = tx.hash || receipt?.hash;
      toast.success(
        txHash
          ? `Transfer initiated: ${EXPLORER_URL}/tx/${txHash}`
          : 'Transfer initiated!',
        { id: 'send-toast' }
      );

      try {
        const recipientBal = await qusdContract.balanceOf(recipientAddress);
        const formatted = formatBalance(recipientBal);
        toast.success(`Recipient QUSD balance: ${formatted}`);
      } catch {}

      setSendAmount('');
      setRecipientAddress('');
      loadBalances();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Transfer failed', { id: 'send-toast' });
      setIsDetectingAnomaly(false);
    } finally {
      setIsLoadingSend(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] to-[#14141f] pb-20 text-white selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-2xl font-bold tracking-tight text-white hover:opacity-80 transition-opacity">
              Qie<span className="text-cyan-400">Remit</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <PriceTicker />
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-cyan-400' : 'bg-red-500'} shadow-[0_0_10px_rgba(34,211,238,0.5)]`} />
              <span className="text-xs font-medium text-gray-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {account && (
               <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 pr-3 rounded-full transition-colors border border-transparent hover:border-white/10" onClick={handleCopyAddress}>
                 <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/20">
                   {account.slice(2, 4)}
                 </div>
                 <span className="text-sm font-medium text-gray-300 font-mono">{formatAddress(account)}</span>
                 <Copy className="w-3 h-3 text-gray-500" />
               </div>
            )}
            <button onClick={disconnectWallet} className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-gray-400">Manage your assets and global transfers</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowReceiveModal(true)} className="glass-card px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium text-white hover:bg-white/10 transition-colors border border-white/10">
              <QrCode className="w-4 h-4 text-cyan-400" /> Receive
            </button>
            <button onClick={loadBalances} className="glass-card px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium text-white hover:bg-white/10 transition-colors border border-white/10">
              <RefreshCw className="w-4 h-4 text-cyan-400" /> Refresh
            </button>
          </div>
        </div>

        {!isKycVerified && (
          <div className="glass-card rounded-2xl p-4 mb-8 border border-yellow-500/20 bg-yellow-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm text-yellow-200">Identity verification required to use swap and send.</p>
              </div>
            </div>
            <a
              href="https://verify-with.blockpass.org/?clientId=financial_app_00065"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-blue-500"
            >
              Verify with Blockpass
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Balances & Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="glass-card rounded-2xl p-6 relative overflow-hidden group bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-white/10"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet className="w-24 h-24 text-cyan-400" />
                </div>
                <h3 className="text-gray-400 font-medium mb-1">Native Balance</h3>
                <div className="text-3xl font-bold text-white mb-1">{qieBalance} <span className="text-cyan-400 text-lg">QIE</span></div>
                <div className="text-sm text-gray-500">Blockchain Native Token</div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="glass-card rounded-2xl p-6 relative overflow-hidden group bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/10"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Globe className="w-24 h-24 text-purple-400" />
                </div>
                <h3 className="text-gray-400 font-medium mb-1">Stablecoin Balance</h3>
                <div className="text-3xl font-bold text-white mb-1">{qusdBalance} <span className="text-purple-400 text-lg">QUSD</span></div>
                <div className="text-sm text-gray-500">Pegged 1:1 with USD</div>
              </motion.div>
            </div>

            {/* Main Action Card */}
            <div className="glass-card rounded-2xl p-1 overflow-hidden bg-white/5 border border-white/10">
              <div className="flex border-b border-white/10">
                <button 
                  onClick={() => setActiveTab('swap')}
                  className={`flex-1 py-4 text-center font-medium transition-colors relative ${activeTab === 'swap' ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                >
                  <span className="flex items-center justify-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Swap QIE/QUSD</span>
                  {activeTab === 'swap' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />}
                </button>
                <button 
                  onClick={() => setActiveTab('send')}
                  className={`flex-1 py-4 text-center font-medium transition-colors relative ${activeTab === 'send' ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                >
                  <span className="flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Global Send</span>
                  {activeTab === 'send' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'swap' ? (
                    <motion.div 
                      key="swap"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Amount to Swap (QIE)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-cyan-500/50 focus:outline-none transition-colors"
                            value={swapAmount}
                            onChange={(e) => setSwapAmount(e.target.value)}
                          />
                          <button 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-cyan-500/10 text-cyan-400 px-2 py-1 rounded hover:bg-cyan-500/20 font-medium border border-cyan-500/20 transition-colors"
                            onClick={() => setSwapAmount(qieBalance)}
                          >
                            MAX
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <div className="bg-white/5 p-2 rounded-full border border-white/10">
                          <ArrowRightLeft className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                        <span className="text-gray-400 text-sm">You Receive (Estimated)</span>
                        <span className="text-xl font-bold text-white font-mono">
                          {swapAmount ? (parseFloat(swapAmount) * oraclePrice).toFixed(6) : '0.00'} QUSD
                        </span>
                      </div>

                      <button 
                        onClick={handleSwap}
                        disabled={isLoadingSwap || !swapAmount || !isKycVerified}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 transition-all"
                      >
                        {isLoadingSwap ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Swap to Stablecoin'}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="send"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                       <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Recipient Address</label>
                        <input 
                          type="text" 
                          placeholder="0x..." 
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:border-purple-500/50 focus:outline-none transition-colors"
                          value={recipientAddress}
                          onChange={(e) => setRecipientAddress(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Amount (QUSD)</label>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-purple-500/50 focus:outline-none transition-colors"
                            value={sendAmount}
                            onChange={(e) => setSendAmount(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">Target Currency</label>
                          <select 
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer focus:border-purple-500/50 focus:outline-none transition-colors"
                            value={targetCurrency}
                            onChange={(e) => setTargetCurrency(e.target.value)}
                          >
                            <option value="USD" className="bg-gray-900 text-white">🇺🇸 USD</option>
                            <option value="EUR" className="bg-gray-900 text-white">🇪🇺 EUR</option>
                            <option value="INR" className="bg-gray-900 text-white">🇮🇳 INR</option>
                            <option value="GBP" className="bg-gray-900 text-white">🇬🇧 GBP</option>
                            <option value="JPY" className="bg-gray-900 text-white">🇯🇵 JPY</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-400 text-sm">Exchange Rate</span>
                          <span className="text-sm text-white font-medium">1 QUSD ≈ 1 {targetCurrency}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-400 text-sm">Network Fee</span>
                          <span className="text-sm text-green-400 font-medium">Free (Testnet)</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                          <span className="text-gray-400 text-sm">Total to Send</span>
                          <span className="text-lg font-bold text-white font-mono">{sendAmount || '0.00'} QUSD</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleSend}
                        disabled={isLoadingSend || !sendAmount || !recipientAddress || !isKycVerified}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoadingSend ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Global Payment'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Info & History */}
          <div className="space-y-6">
            {/* Security Widget */}
            <UserSecurityStatus result={lastAnomaly} />

            {/* Privacy & Compliance */}
            <PrivacySettings />

            {/* Currency Converter */}
             <div className="glass-card rounded-2xl p-6 bg-white/5 border border-white/10">
              <CurrencyConverter />
            </div>
          </div>
        </div>
      </main>
      
      <ReceiveModal
        isOpen={showReceiveModal}
        walletAddress={account || ''}
        onClose={() => setShowReceiveModal(false)}
      />
    </div>
  );
}
