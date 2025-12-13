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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-extrabold mb-6 text-gray-900 tracking-tight">
              QieRemit
            </h1>
            <p className="text-2xl md:text-3xl text-gray-700 mb-6 max-w-3xl mx-auto font-light">
              Borderless Financial Freedom
            </p>
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Send money globally, instantly, and securely. Powered by QUSD stablecoin and the Qie blockchain network.
            </p>
            
            <button
              onClick={handleLaunch}
              className="group inline-flex items-center gap-3 px-10 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span>Launch App</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose QieRemit?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Experience the future of cross-border payments</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card-elevated rounded-2xl p-8 border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Lightning Fast</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Execute cross-border transfers in seconds, not days. Powered by cutting-edge blockchain technology.
            </p>
          </div>

          <div className="card-elevated rounded-2xl p-8 border border-gray-100">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Global Reach</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Send money to anyone, anywhere. No borders, no limits, no traditional banking delays.
            </p>
          </div>

          <div className="card-elevated rounded-2xl p-8 border border-gray-100">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Secure & Trusted</h3>
            <p className="text-gray-600 leading-relaxed text-base">
              Built on smart contracts with transparent, auditable transactions on the blockchain.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 font-medium">© 2025 QieRemit. Built for Qie Hackathon.</p>
        </div>
      </div>
    </div>
  );
}

