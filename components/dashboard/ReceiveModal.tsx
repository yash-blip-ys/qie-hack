'use client';

import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import QRCode from 'react-qr-code'; // <--- UPDATED IMPORT

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export default function ReceiveModal({ isOpen, onClose, walletAddress }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white">Receive Funds</h3>
            <p className="text-slate-400 text-sm">Scan to send QIE or QUSD</p>
          </div>

          <div className="bg-white p-4 rounded-2xl w-fit mx-auto">
            <QRCode 
              value={walletAddress || ''} 
              size={200}
              viewBox={`0 0 256 256`}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Your Wallet Address</p>
            <div 
              onClick={handleCopy}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition group"
            >
              <code className="text-sm text-slate-300 truncate mr-2 font-mono">
                {walletAddress}
              </code>
              <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition text-slate-400">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </div>
            </div>
            {copied && <p className="text-xs text-green-400 font-medium">Copied to clipboard!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}