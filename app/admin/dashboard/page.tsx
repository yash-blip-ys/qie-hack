'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, CheckCircle, Activity, Users, Globe } from 'lucide-react';
import TransactionHistory from '@/components/dashboard/TransactionHistory';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('qie_admin_auth');
    if (auth !== 'true') {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] to-[#14141f] text-white">
      {/* Admin Header */}
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-cyan-500" />
              <span className="font-bold text-xl tracking-tight text-white">QieRemit <span className="text-cyan-400 font-normal">Admin</span></span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('qie_admin_auth');
                router.push('/');
              }}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Security Overview</h1>
          <p className="text-gray-400">Real-time anomaly detection and system monitoring</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Threat Level</h3>
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">Low</div>
            <div className="mt-2 text-xs text-green-400 font-medium">System stable</div>
          </div>
          
          <div className="glass-card p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Active Users</h3>
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">1,234</div>
            <div className="mt-2 text-xs text-blue-400 font-medium">+12% this week</div>
          </div>

          <div className="glass-card p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Cross-Border Vol</h3>
              <Globe className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">$45.2k</div>
            <div className="mt-2 text-xs text-purple-400 font-medium">24h volume</div>
          </div>

          <div className="glass-card p-6 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400">Flagged Tx</h3>
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-white">3</div>
            <div className="mt-2 text-xs text-orange-400 font-medium">Requires review</div>
          </div>
        </div>

        {/* Detailed Anomaly View */}
        <div className="glass-card rounded-xl border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Detailed Transaction Analysis</h2>
            <p className="text-sm text-gray-400">Full audit log of recent network activity</p>
          </div>
          <div className="p-6">
            <TransactionHistory />
          </div>
        </div>
      </main>
    </div>
  );
}
