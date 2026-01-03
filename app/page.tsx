'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Zap, Shield, ChevronRight, Lock, Globe } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { motion } from 'framer-motion';
import GlobeViz from '@/components/ui/GlobeViz';
import LiveTicker from '@/components/ui/LiveTicker';

export default function LandingPage() {
  const router = useRouter();
  const { connectWallet, isConnected } = useWeb3();
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLaunch = async () => {
    try {
      if (!isConnected) {
        await connectWallet();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Error launching app:', error);
    }
  };

  const handleAdminLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAdminError('');
    setLoggingIn(true);
    try {
      if (adminPassword === 'admin123') {
        localStorage.setItem('qie_admin_auth', 'true');
        setShowAdmin(false);
        setAdminPassword('');
        router.push('/admin');
      } else {
        setAdminError('Invalid Access Code');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 50 } }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex flex-col">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-32 pb-16 flex-grow flex flex-col justify-center w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-left z-10"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8 border border-cyan-500/30">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <span className="text-sm font-medium text-cyan-200">Live on Qie Testnet</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
              <span className="text-white">Remittance </span>
              <span className="text-gradient">Reimagined</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl font-light leading-relaxed">
              Send money globally, instantly, and securely. 
              Powered by <span className="text-cyan-400 font-medium">QUSD</span> stablecoin and the <span className="text-violet-400 font-medium">Qie blockchain</span>.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 items-center">
              <button
                onClick={handleLaunch}
                className="group btn-primary px-8 py-4 rounded-xl font-bold text-lg inline-flex items-center gap-3"
              >
                <span>Launch App</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => setShowAdmin(true)}
                className="px-6 py-4 rounded-xl font-bold text-lg inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white transition backdrop-blur-sm"
              >
                <Lock className="w-5 h-5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column: Globe */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative h-[400px] lg:h-[600px] w-full flex items-center justify-center pointer-events-auto"
          >
            <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full opacity-20" />
            <GlobeViz />
          </motion.div>
        </div>
      </div>

      {/* Ticker Section */}
      <div className="relative z-10 w-full mb-12">
        <LiveTicker />
      </div>

      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20">
              <Zap className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">Lightning Fast</h3>
            <p className="text-gray-400 leading-relaxed">
              Execute cross-border transfers in seconds, not days. Powered by cutting-edge blockchain technology.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="w-14 h-14 bg-violet-500/10 rounded-2xl flex items-center justify-center mb-6 border border-violet-500/20">
              <Globe className="w-7 h-7 text-violet-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">Global Reach</h3>
            <p className="text-gray-400 leading-relaxed">
              Send money to anyone, anywhere. No borders, no limits, no traditional banking delays.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center mb-6 border border-pink-500/20">
              <Shield className="w-7 h-7 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">Secure & Trusted</h3>
            <p className="text-gray-400 leading-relaxed">
              Built on smart contracts with transparent, auditable transactions on the blockchain.
            </p>
          </motion.div>
        </div>
      </div>

      {showAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl border border-white/10 bg-black/80 p-6 w-full max-w-md"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Admin Login</h2>
                <p className="text-xs text-gray-400">Enter the access code to continue</p>
              </div>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                type="password"
                placeholder="Access code"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              {adminError ? (
                <div className="text-xs text-red-400">{adminError}</div>
              ) : null}
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdmin(false);
                    setAdminPassword('');
                    setAdminError('');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm border border-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition disabled:opacity-60"
                >
                  {loggingIn ? 'Logging in…' : 'Login'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="border-t border-gray-800/50 bg-black/20 py-12 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 font-medium">© 2025 QieRemit. Built for Qie Hackathon.</p>
        </div>
      </div>
    </div>
  );
}
