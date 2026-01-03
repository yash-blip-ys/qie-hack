'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { getContract, ORACLE_ABI } from '@/lib/web3';
import { ethers } from 'ethers';
import { TrendingUp, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const ORACLE_ADDRESS = process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS || '';

export default function PriceTicker() {
  const { provider } = useWeb3();
  const [price, setPrice] = useState<string>('0.00');
  const [prevPrice, setPrevPrice] = useState<string>('0.00');
  const [direction, setDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  useEffect(() => {
    if (!provider || !ORACLE_ADDRESS) return;

    const fetchPrice = async () => {
      try {
        const contract = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
        const priceWei = await contract.getPrice();
        const priceFormatted = ethers.formatUnits(priceWei, 18);
        const priceFixed = parseFloat(priceFormatted).toFixed(4);

        setPrevPrice(current => {
          if (parseFloat(priceFixed) > parseFloat(current)) setDirection('up');
          else if (parseFloat(priceFixed) < parseFloat(current)) setDirection('down');
          return current;
        });

        setPrice(priceFixed);
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000); // Poll every 5s

    // Listen for events if possible
    const contract = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
    const filter = contract.filters.PriceUpdated();
    
    contract.on(filter, (newPrice) => {
      const priceFormatted = ethers.formatUnits(newPrice, 18);
      const priceFixed = parseFloat(priceFormatted).toFixed(4);
      
      setPrevPrice(current => {
        if (parseFloat(priceFixed) > parseFloat(current)) setDirection('up');
        else if (parseFloat(priceFixed) < parseFloat(current)) setDirection('down');
        return current;
      });
      setPrice(priceFixed);
    });

    return () => {
      clearInterval(interval);
      contract.removeAllListeners();
    };
  }, [provider]);

  return (
    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-gray-800">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-gray-400">QIE/USD</span>
      </div>
      <div className="flex items-center gap-1">
        <motion.span 
          key={price}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`font-mono font-bold ${
            direction === 'up' ? 'text-green-400' : 
            direction === 'down' ? 'text-red-400' : 'text-white'
          }`}
        >
          ${price}
        </motion.span>
        {direction === 'up' && <TrendingUp className="w-3 h-3 text-green-400" />}
        {direction === 'down' && <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />}
      </div>
    </div>
  );
}
