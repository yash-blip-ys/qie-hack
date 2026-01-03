'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { ethers } from 'ethers';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { getRpcUrl } from '@/config';
import { MOCK_ORACLE_ABI, formatOraclePrice } from '@/lib/oracles';

const FIAT_MULTIPLIERS: Record<string, number> = {
  EUR: 0.92,
  INR: 83.0,
  GBP: 0.79,
  USD: 1.0,
  JPY: 150.0,
};

const ORACLE_ADDRESS = process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS;

export default function CurrencyConverter() {
  const { provider } = useWeb3();
  const [fromAmount, setFromAmount] = useState<string>('1');
  const [toCurrency, setToCurrency] = useState<string>('EUR');
  const [convertedAmount, setConvertedAmount] = useState<string>('0.92');
  const [oraclePrice, setOraclePrice] = useState<number>(1);
  const [isFetchingRate, setIsFetchingRate] = useState(false);

  useEffect(() => {
    if (!ORACLE_ADDRESS) {
      setOraclePrice(1);
      setIsFetchingRate(false);
      return;
    }

    let isCancelled = false;

    const fetchOraclePrice = async () => {
      setIsFetchingRate(true);
      try {
        const rpcProvider = provider ?? new ethers.JsonRpcProvider(getRpcUrl());
        const oracleContract = new ethers.Contract(ORACLE_ADDRESS, MOCK_ORACLE_ABI, rpcProvider);
        const [rawPrice, decimals] = await Promise.all([
          oracleContract.getPrice(),
          oracleContract.decimals().catch(() => 18),
        ]);
        const formatted = formatOraclePrice(rawPrice, decimals);
        if (!isCancelled) {
          setOraclePrice(formatted);
        }
      } catch (error) {
        console.error('Oracle fetch failed:', error);
        if (!isCancelled) {
          setOraclePrice(1);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingRate(false);
        }
      }
    };

    fetchOraclePrice();
    const interval = setInterval(fetchOraclePrice, 30_000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [provider]);

  useEffect(() => {
    const amount = parseFloat(fromAmount) || 0;
    const multiplier = FIAT_MULTIPLIERS[toCurrency] ?? 1;
    const liveRate = oraclePrice * multiplier;
    const result = (amount * liveRate).toFixed(2);
    setConvertedAmount(result);
  }, [fromAmount, toCurrency, oraclePrice]);

  const multiplier = FIAT_MULTIPLIERS[toCurrency] ?? 1;
  const currentRate = oraclePrice * multiplier;

  return (
    <div>
      <h3 className="text-gray-400 font-medium mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" /> Live Rates
        {isFetchingRate && <RefreshCw className="w-3 h-3 animate-spin ml-auto" />}
      </h3>
      
      <div className="space-y-4">
        <div className="relative">
          <label className="text-xs text-gray-500 mb-1 block">QIE Amount</label>
          <input 
            type="number" 
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white font-mono focus:border-cyan-500/50 focus:outline-none transition-colors"
          />
        </div>

        <div className="relative">
          <label className="text-xs text-gray-500 mb-1 block">Converted To</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={convertedAmount}
              readOnly
              className="flex-1 bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-cyan-400 font-mono font-bold"
            />
            <select 
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 text-white focus:outline-none cursor-pointer"
            >
              {Object.keys(FIAT_MULTIPLIERS).map((curr) => (
                <option key={curr} value={curr}>{curr}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 flex justify-between pt-2 border-t border-gray-800/50">
          <span>Current Rate:</span>
          <span className="font-mono text-cyan-400">1 QIE = {currentRate.toFixed(4)} {toCurrency}</span>
        </div>
      </div>
    </div>
  );
}
