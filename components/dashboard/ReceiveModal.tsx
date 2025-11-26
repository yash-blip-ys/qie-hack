'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { formatAddress } from '@/lib/web3';
import { toast } from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamically import QR code to avoid SSR issues
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeSVG),
  { ssr: false }
);

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const { account } = useWeb3();
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !account) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="backdrop-blur-lg bg-slate-900/95 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Receive Funds
          </h2>
          <p className="text-slate-400 text-sm">
            Share this address to receive QIE or QUSD
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl mb-6 flex items-center justify-center min-h-[200px]">
          {mounted && account ? (
            <QRCodeSVG
              value={account}
              size={200}
              level="M"
              includeMargin={true}
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
          ) : (
            <div className="w-[200px] h-[200px] bg-slate-200 animate-pulse rounded"></div>
          )}
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 mb-2">Your Wallet Address</p>
            <p className="font-mono text-sm text-white break-all">{account}</p>
          </div>

          <button
            onClick={handleCopy}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Address
              </>
            )}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Only send QIE or QUSD tokens to this address. Sending other tokens may result in permanent loss.
          </p>
        </div>
      </div>
    </div>
  );
}

