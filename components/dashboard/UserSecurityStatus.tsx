'use client';

import { Shield, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import { AnomalyResult } from '@/lib/anomaly';
import { motion } from 'framer-motion';

export default function UserSecurityStatus({ result }: { result: AnomalyResult | null }) {
  if (!result) {
    return (
      <div className="glass-card rounded-xl p-4 border border-white/10 flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded-full border border-white/10">
          <Shield className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Security Status</h3>
          <p className="text-xs text-gray-400">Monitoring your transactions...</p>
        </div>
      </div>
    );
  }

  const isSafe = result.verdict === 'CLEAR';
  const isSuspicious = result.verdict === 'SUSPICIOUS';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-xl p-4 border flex items-start gap-3 ${
        isSafe ? 'bg-green-500/10 border-green-500/20' : 
        isSuspicious ? 'bg-orange-500/10 border-orange-500/20' : 'bg-red-500/10 border-red-500/20'
      }`}
    >
      <div className={`p-2 rounded-full mt-1 border ${
        isSafe ? 'bg-green-500/20 border-green-500/30 text-green-400' : 
        isSuspicious ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
      }`}>
        {isSafe ? <CheckCircle className="w-5 h-5" /> : 
         isSuspicious ? <AlertTriangle className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
      </div>
      
      <div>
        <h3 className={`text-sm font-semibold ${
          isSafe ? 'text-green-400' : 
          isSuspicious ? 'text-orange-400' : 'text-red-400'
        }`}>
          {isSafe ? 'Account Secure' : 'Security Alert'}
        </h3>
        <p className={`text-xs mt-1 ${
          isSafe ? 'text-green-200/80' : 
          isSuspicious ? 'text-orange-200/80' : 'text-red-200/80'
        }`}>
          {isSafe 
            ? "No suspicious activity detected in your recent transactions." 
            : result.reasons[0] || "Unusual activity detected. Please review your recent actions."}
        </p>
        {!isSafe && (
          <div className="mt-2 text-xs font-medium underline cursor-pointer hover:opacity-80 text-white/80">
            View Details
          </div>
        )}
      </div>
    </motion.div>
  );
}
