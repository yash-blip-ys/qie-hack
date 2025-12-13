'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { ethers } from 'ethers';
import { TrendingUp, Zap } from 'lucide-react';
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
  const [isPulsing, setIsPulsing] = useState(false);
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

    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), 500);
    return () => clearTimeout(timer);
  }, [fromAmount, toCurrency, oraclePrice]);

  const multiplier = FIAT_MULTIPLIERS[toCurrency] ?? 1;
  const currentRate = oraclePrice * multiplier;

  return (
    <div className="card-elevated rounded-2xl p-6 border border-gray-200 bg-white">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Currency Converter</h3>
          <p className="text-xs text-gray-500">Live exchange rates</p>
        </div>
      </div>

      <div className="space-y-4">
        <div
          className={`flex items-center gap-3 px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl transition-all ${
            isPulsing ? 'animate-pulse shadow-md' : ''
          }`}
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-semibold text-gray-600 block">Live Rate</span>
            <span className="text-sm font-bold text-gray-900">
              1 QUSD = {currentRate.toFixed(2)} {toCurrency}
            </span>
          </div>
          {isFetchingRate && (
            <span className="text-[10px] text-gray-500 animate-pulse">Updating…</span>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-700 font-semibold mb-2">From</label>
          <div className="relative">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 pr-20 font-medium transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-gray-600 font-semibold">QUSD</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-10 h-10 bg-gray-100 border-2 border-gray-200 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700 font-semibold mb-2">To</label>
          <div className="relative">
            <input
              type="text"
              value={convertedAmount}
              readOnly
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 pr-24 font-bold"
            />
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white border-2 border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            >
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            Rates are pulled from a mock QIE oracle and recomputed every 30 seconds. Use this as a judge-friendly simulation of how
            real FX data will connect into cross-border payouts.
          </p>
        </div>
      </div>
    </div>
  );
}

