'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ExternalLink, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface KYCVerificationProps {
  initialVerifiedStatus?: boolean;
}

export default function KYCVerification({ initialVerifiedStatus = false }: KYCVerificationProps) {
  const [isVerified, setIsVerified] = useState(initialVerifiedStatus);

  // Sync with prop if it changes (optional, but good for real app integration)
  useEffect(() => {
    if (initialVerifiedStatus) {
      setIsVerified(true);
    }
  }, [initialVerifiedStatus]);

  const handleVerifyClick = () => {
    window.open('https://verify-with.blockpass.org/?clientId=financial_app_00065', '_blank');
  };

  // Demo toggle function
  const toggleDemoStatus = () => {
    setIsVerified(!isVerified);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 border border-white/10 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <ShieldCheck className="w-24 h-24 text-cyan-400" />
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full border ${
            isVerified 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
          }`}>
            {isVerified ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Identity Verification</h3>
            <p className="text-xs text-gray-400">KYC Compliance</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
          isVerified 
            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
        }`}>
          {isVerified ? 'Verified' : 'Unverified'}
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-6 leading-relaxed">
        {isVerified 
          ? "Your identity has been verified. You have full access to all global transfer features."
          : "Verify your identity to unlock higher transfer limits and ensure compliance with global financial regulations."}
      </p>

      {isVerified ? (
        <div className="w-full bg-green-500/10 border border-green-500/20 text-green-400 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Identity Verified
        </div>
      ) : (
        <button 
          onClick={handleVerifyClick}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
        >
          Verify with Blockpass <ExternalLink className="w-4 h-4" />
        </button>
      )}

      {/* Demo / Developer Control - Hidden functionality for demo video */}
      <div 
        onClick={toggleDemoStatus}
        className="absolute bottom-1 right-1 w-4 h-4 opacity-0 cursor-pointer z-10"
        title="Demo: Toggle Verification Status"
      />
    </motion.div>
  );
}
