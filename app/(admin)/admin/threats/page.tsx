'use client';

import { useEffect, useState } from 'react';
import { Shield, Loader2, Flag, Check, Snowflake } from 'lucide-react';
import { formatAddress } from '@/lib/web3';

interface AdminAlert {
  _id: string;
  verdict: 'CLEAR' | 'SUSPICIOUS' | 'ANOMALY';
  score: number;
  reasons: string[];
  event: {
    wallet: string;
    action: string;
    amount?: number;
    fingerprint?: string;
  };
  ipRisk?: Record<string, any>;
  createdAt?: string;
}

export default function ThreatsPage() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/anomaly/alerts?limit=25');
        const payload = await res.json();
        setAlerts(payload.data || []);
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const actBtn = 'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Threat Detection</h1>
          <p className="text-sm text-gray-400">Redis-backed anomaly intelligence</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Refreshing
          </div>
        )}
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 bg-white/5 border border-white/10 flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-400">No flagged events yet</p>
          </div>
        ) : (
          alerts.map((a) => (
            <div key={a._id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-gray-300">
                    {a.event.action === 'swap' ? 'Swap' : 'Transfer'} · {formatAddress(a.event.wallet)}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-gray-300">
                      Fingerprint: {a.event.fingerprint || 'n/a'}
                    </span>
                    {a.ipRisk?.abuseConfidenceScore !== undefined ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                        IP Reputation: {a.ipRisk?.abuseConfidenceScore ?? 'n/a'}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      a.verdict === 'ANOMALY'
                        ? 'text-red-300'
                        : a.verdict === 'SUSPICIOUS'
                        ? 'text-orange-300'
                        : 'text-green-300'
                    }`}
                  >
                    {a.verdict} {typeof a.score === 'number' ? `(${a.score})` : ''}
                  </p>
                  <p className="text-xs text-gray-500">{a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              {a.reasons?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.reasons.map((r) => (
                    <span key={r} className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-gray-300">
                      {r}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={async () => {
                    setAlerts((prev) => prev.filter((x) => x._id !== a._id));
                  }}
                  className={`${actBtn} bg-white/10 border-white/20 text-gray-200 hover:bg-white/20`}
                >
                  Dismiss
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/admin/threats/flag', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wallet: a.event.wallet }),
                      });
                    } catch {}
                  }}
                  className={`${actBtn} bg-orange-500/20 border-orange-500/30 text-orange-200 hover:bg-orange-500/30`}
                >
                  Flag User
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/admin/threats/freeze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wallet: a.event.wallet }),
                      });
                    } catch {}
                  }}
                  className={`${actBtn} bg-red-500/20 border-red-500/30 text-red-200 hover:bg-red-500/30`}
                >
                  Freeze Function
                </button>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/admin/threats/quarantine', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ wallet: a.event.wallet, fingerprint: a.event.fingerprint }),
                      });
                    } catch {}
                  }}
                  className={`${actBtn} bg-cyan-500/20 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/30 inline-flex items-center gap-1`}
                >
                  <Snowflake className="w-3 h-3" /> Quarantine Fingerprint
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
