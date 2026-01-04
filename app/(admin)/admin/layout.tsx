'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWeb3 } from '@/contexts/Web3Provider';
import { Shield, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';

function useAdminAuth() {
  const { account, isConnected } = useWeb3();
  const [authorized, setAuthorized] = useState(false);

  const allowed = useMemo(() => {
    const list =
      (process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '')
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
    return new Set(list);
  }, []);

  useEffect(() => {
    const localFlag = typeof window !== 'undefined' && window.localStorage.getItem('qie_admin_auth') === 'true';
    const ok = !!account && (allowed.has(account.toLowerCase()) || localFlag);
    setAuthorized(ok);
  }, [account, allowed]);

  return { authorized, isConnected };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { connectWallet, disconnectWallet, account, isConnected, switchNetwork, provider } = useWeb3();
  const { authorized } = useAdminAuth();

  useEffect(() => {
    if (isConnected && !authorized) {
      toast.error('Admin access required');
    }
  }, [isConnected, authorized]);

  useEffect(() => {
    const ensureNetwork = async () => {
      if (provider && switchNetwork) {
        const net = await provider.getNetwork();
        if (Number(net.chainId) !== 1990) {
          await switchNetwork(1990);
        }
      }
    };
    ensureNetwork();
  }, [provider, switchNetwork]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl border border-white/10 bg-white/5 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold">Admin Access</h1>
          <p className="text-sm text-gray-400">Connect the authorized wallet to continue.</p>
          <button
            onClick={connectWallet}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition"
          >
            Connect Wallet
          </button>
          <div className="text-xs text-gray-500">
            Or use the demo login at <Link href="/admin/login" className="underline">/admin/login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="glass-card p-8 rounded-3xl border border-white/10 bg-white/5 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold">Not Authorized</h1>
          <p className="text-sm text-gray-400">This module is restricted to admin wallets.</p>
          <div className="flex items-center justify-center gap-2">
            <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition">
              Back to Dashboard
            </Link>
            <Link href="/admin/login" className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition">
              Demo Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nav = [
    { href: '/admin', label: 'Overview' },
    { href: '/admin/kyc', label: 'KYC' },
    { href: '/admin/ledger', label: 'Ledger' },
    { href: '/admin/threats', label: 'Threats' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] to-[#14141f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              Qie<span className="text-cyan-400">Remit</span> Admin
            </Link>
            <nav className="flex items-center gap-2">
              {nav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-transparent border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">{account}</span>
            <button
              onClick={disconnectWallet}
              className="p-2 text-gray-400 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
              aria-label="Disconnect"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
