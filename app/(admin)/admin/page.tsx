'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { ethers } from 'ethers';
import { QUSD_ABI } from '@/lib/web3';
import { getExplorerUrl } from '@/config';
import { TrendingUp, ShieldAlert, Users, Activity } from 'lucide-react';

const QUSD_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_QSTABLE_CONTRACT_ADDRESS || '';
const TREASURY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_CONTRACT_ADDRESS || '';

type AlertsSummary = { ANOMALY: number; SUSPICIOUS: number; CLEAR: number };

export default function AdminOverviewPage() {
  const { provider } = useWeb3();
  const [treasuryQie, setTreasuryQie] = useState<string>('0');
  const [treasuryQusd, setTreasuryQusd] = useState<string>('0');
  const [throughput24h, setThroughput24h] = useState<number>(0);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary>({ ANOMALY: 0, SUSPICIOUS: 0, CLEAR: 0 });
  const [kycPending, setKycPending] = useState<number>(0);

  const explorer = useMemo(() => getExplorerUrl(), []);
  const hasTreasury = Boolean(TREASURY_CONTRACT_ADDRESS);

  useEffect(() => {
    const loadBalances = async () => {
      if (!provider || !TREASURY_CONTRACT_ADDRESS) return;
      const bal = await provider.getBalance(TREASURY_CONTRACT_ADDRESS);
      setTreasuryQie(ethers.formatEther(bal));
      if (QUSD_CONTRACT_ADDRESS) {
        const qusd = new ethers.Contract(QUSD_CONTRACT_ADDRESS, QUSD_ABI, provider);
        const tokenBal = await qusd.balanceOf(TREASURY_CONTRACT_ADDRESS);
        setTreasuryQusd(ethers.formatEther(tokenBal));
      }
    };
    loadBalances().catch(() => undefined);
  }, [provider]);

  useEffect(() => {
    const loadThroughput = async () => {
      try {
        const res = await fetch('/api/transfers?limit=200');
        if (!res.ok) return;
        const data = await res.json();
        const now = Date.now();
        const cutoff = now - 24 * 60 * 60 * 1000;
        const count = (data.data || []).filter((t: any) => Number(t.timestamp) >= cutoff).length;
        setThroughput24h(count);
      } catch {
        setThroughput24h(0);
      }
    };
    loadThroughput();
  }, []);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const res = await fetch('/api/anomaly/alerts?limit=50');
        const payload = await res.json();
        setAlertsSummary(payload.summary || { ANOMALY: 0, SUSPICIOUS: 0, CLEAR: 0 });
      } catch {
        setAlertsSummary({ ANOMALY: 0, SUSPICIOUS: 0, CLEAR: 0 });
      }
    };
    loadAlerts();
  }, []);

  useEffect(() => {
    const loadKycPending = async () => {
      try {
        const res = await fetch('/api/admin/kyc/pending');
        const payload = await res.json();
        setKycPending(payload.count || 0);
      } catch {
        setKycPending(0);
      }
    };
    loadKycPending();
  }, []);

  const card = 'glass-card rounded-2xl p-6 bg-white/5 border border-white/10';
  const stat = 'text-3xl font-extrabold tracking-tight text-white';
  const label = 'text-sm uppercase tracking-wider text-gray-400 font-semibold';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">System Overview</h1>
          <p className="text-gray-400">Live protocol telemetry and admin KPIs</p>
        </div>
        {hasTreasury ? (
          <a
            href={`${explorer}/address/${TREASURY_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm text-gray-200"
          >
            View Treasury on Explorer
          </a>
        ) : (
          <a
            href="/admin/settings"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm text-gray-200"
          >
            Set Treasury Address
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={label}>Treasury QIE</span>
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <p className={stat}>{Number(treasuryQie).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
          <p className="text-xs text-gray-500">Native QIE coin</p>
        </div>
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={label}>Treasury QUSD</span>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className={stat}>{Number(treasuryQusd).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500">Stablecoin holdings</p>
        </div>
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={label}>Throughput (24h)</span>
            <Activity className="w-5 h-5 text-yellow-400" />
          </div>
          <p className={stat}>{throughput24h}</p>
          <p className="text-xs text-gray-500">Transfers processed</p>
        </div>
        <div className={card}>
          <div className="flex items-center justify-between">
            <span className={label}>Risk Alerts</span>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <p className={stat}>{alertsSummary.ANOMALY}</p>
          <p className="text-xs text-gray-500">High-risk anomalies</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`${card} md:col-span-1`}>
          <span className={label}>KYC Pending Approvals</span>
          <p className={stat}>{kycPending}</p>
          <p className="text-xs text-gray-500">Users awaiting verification</p>
        </div>
        <div className={`${card} md:col-span-2`}>
          <span className={label}>Monitoring</span>
          <p className="text-sm text-gray-400 mt-2">
            Admin console is connected to Redis-backed anomaly engine and MongoDB ledger.
          </p>
          <div className="mt-3 flex gap-2">
            <a href="/admin/threats" className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
              Review Threats
            </a>
            <a href="/admin/ledger" className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-sm">
              Open Ledger
            </a>
            <a href="/admin/settings" className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-gray-200 text-sm">
              System Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
