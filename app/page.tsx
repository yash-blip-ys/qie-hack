'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Globe, Zap, Shield } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Provider';

export default function LandingPage() {
  const router = useRouter();
  const { connectWallet, isConnected } = useWeb3();

  const handleLaunch = async () => {
    try {
      if (!isConnected) {
        await connectWallet();
        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Error launching app:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-cyan-900/20 to-slate-900"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              QieRemit
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-4 max-w-3xl mx-auto">
              Borderless Financial Freedom on the Qie Blockchain
            </p>
            <p className="text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
              Send money globally, instantly, and securely. Powered by QUSD stablecoin and the Qie network.
            </p>
            
            <button
              onClick={handleLaunch}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transform hover:scale-105"
            >
              Launch App
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
            <p className="text-slate-400">
              Execute cross-border transfers in seconds, not days. Powered by blockchain technology.
            </p>
          </div>

          <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Global Reach</h3>
            <p className="text-slate-400">
              Send money to anyone, anywhere. No borders, no limits, no traditional banking delays.
            </p>
          </div>

          <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-cyan-500/50 transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Secure & Trusted</h3>
            <p className="text-slate-400">
              Built on smart contracts with transparent, auditable transactions on the blockchain.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          <p>© 2024 QieRemit. Built for Qie Hackathon.</p>
        </div>
      </div>
    </div>
  );
}

