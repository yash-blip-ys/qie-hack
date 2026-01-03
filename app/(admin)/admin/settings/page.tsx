'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { ethers } from 'ethers';
import { ORACLE_ABI, TREASURY_ABI } from '@/lib/web3';
import { toast } from 'react-hot-toast';
import { Wallet, DollarSign, ArrowDownToLine } from 'lucide-react';

const ORACLE_ADDRESS = process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS || '';
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS || '';

export default function AdminSettingsPage() {
  const { provider, signer } = useWeb3();
  const [currentPrice, setCurrentPrice] = useState<string>('0');
  const [newPrice, setNewPrice] = useState<string>('');
  const [withdrawAddress, setWithdrawAddress] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    const loadPrice = async () => {
      try {
        if (!provider || !ORACLE_ADDRESS) return;
        const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
        const p = await oracle.getPrice();
        setCurrentPrice(ethers.formatUnits(p, 18));
      } catch {
        setCurrentPrice('0');
      }
    };
    loadPrice();
  }, [provider]);

  const handleUpdatePrice = async () => {
    if (!signer || !ORACLE_ADDRESS || !newPrice) {
      toast.error('Enter a price and connect an admin wallet');
      return;
    }
    setIsUpdating(true);
    try {
      const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, signer);
      const tx = await oracle.setPrice(ethers.parseUnits(newPrice, 18));
      toast.loading('Updating oracle price…', { id: 'oracle-price' });
      await tx.wait();
      toast.success('Oracle updated', { id: 'oracle-price' });
      setNewPrice('');
      const p = await oracle.getPrice();
      setCurrentPrice(ethers.formatUnits(p, 18));
    } catch (error: any) {
      toast.error(error?.message || 'Update failed', { id: 'oracle-price' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWithdraw = async () => {
    if (!signer || !TREASURY_ADDRESS || !withdrawAddress || !withdrawAmount) {
      toast.error('Enter address and amount');
      return;
    }
    setIsWithdrawing(true);
    try {
      const treasury = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, signer);
      const tx = await treasury.withdrawNative(withdrawAddress, ethers.parseEther(withdrawAmount));
      toast.loading('Withdrawing fees…', { id: 'treasury-withdraw' });
      await tx.wait();
      toast.success('Withdraw complete', { id: 'treasury-withdraw' });
      setWithdrawAddress('');
      setWithdrawAmount('');
    } catch (error: any) {
      toast.error(error?.message || 'Withdraw failed', { id: 'treasury-withdraw' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const card = 'glass-card rounded-2xl p-6 bg-white/5 border border-white/10';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-sm text-gray-400">Oracle tuning and treasury management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={card}>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Mock QIE Oracle</h2>
          </div>
          <p className="text-sm text-gray-400 mt-1">Current price</p>
          <p className="text-2xl font-extrabold">{currentPrice}</p>
          <div className="mt-4 space-y-2">
            <input
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Enter new price (e.g., 1.05)"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
            <button
              onClick={handleUpdatePrice}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition disabled:opacity-60"
            >
              {isUpdating ? 'Updating…' : 'Update Price'}
            </button>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Treasury Management</h2>
          </div>
          <p className="text-sm text-gray-400 mt-1">Withdraw native QIE fees</p>
          <div className="mt-4 space-y-2">
            <input
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              placeholder="Recipient address"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
            <input
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Amount (QIE)"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition disabled:opacity-60 inline-flex items-center gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              {isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

