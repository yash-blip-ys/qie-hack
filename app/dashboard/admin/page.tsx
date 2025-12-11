'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AnomalyBadge from '@/components/dashboard/AnomalyBadge';
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
  };
  createdAt?: string;
  metadata?: Record<string, any>;
}

interface WebhookStatus {
  enabled: boolean;
  webhook: string | null;
}

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [isPingingWebhook, setIsPingingWebhook] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/anomaly/alerts?limit=25');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load alerts');
      }
      setAlerts(payload.data || []);
    } catch (error: any) {
      console.error('Failed to load anomaly alerts', error);
      toast.error(error.message || 'Unable to refresh alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookStatus = async () => {
    try {
      const response = await fetch('/api/anomaly/webhook/status');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to read webhook status');
      }
      setWebhookStatus(payload);
    } catch (error: any) {
      console.error('Webhook status error', error);
    }
  };

  const handlePingWebhook = async () => {
    setIsPingingWebhook(true);
    try {
      const response = await fetch('/api/anomaly/webhook/test', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Webhook ping failed');
      }
      toast.success('Webhook pinged successfully');
      await fetchWebhookStatus();
    } catch (error: any) {
      console.error('Webhook ping error', error);
      toast.error(error.message || 'Webhook ping failed');
    } finally {
      setIsPingingWebhook(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchWebhookStatus();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Admin Console</p>
            <h1 className="text-2xl font-bold">Anomaly Alerts</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3 py-1 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-cyan-400 transition-colors flex items-center gap-1"
            >
              <LinkIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={handlePingWebhook}
              disabled={isPingingWebhook}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isPingingWebhook ? 'Pinging...' : 'Ping Webhook'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="backdrop-blur-sm bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
            <p className="text-sm text-slate-400">Latest Webhook</p>
            <p className="text-lg font-semibold">
              {webhookStatus?.enabled ? 'Connected' : 'Not configured'}
            </p>
            <p className="text-xs text-slate-500">{webhookStatus?.webhook || 'No webhook provided'}</p>
          </div>
          <div className="backdrop-blur-sm bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
            <p className="text-sm text-slate-400">Alerts cached</p>
            <p className="text-lg font-semibold">{alerts.length}</p>
            <p className="text-xs text-slate-500">Updated every 15s</p>
          </div>
          <div className="backdrop-blur-sm bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
            <p className="text-sm text-slate-400">Health</p>
            <p className="text-lg font-semibold">{loading ? 'Refreshing…' : 'Idle'}</p>
            <p className="text-xs text-slate-500">{loading ? 'Fetching alerts' : 'Queue is healthy'}</p>
          </div>
        </div>

        <section className="backdrop-blur-sm bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent Detection Events</h2>
              <p className="text-sm text-slate-400">Powered by the anomaly middleware queue</p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing
              </div>
            )}
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No alerts yet. Trigger a transfer or swap to start logging.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-700/50 bg-slate-950/40 p-4 shadow-inner"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">
                        {alert.event.action === 'swap' ? 'Swap' : 'Transfer'} · {formatAddress(alert.event.wallet)}
                      </p>
                      <p className="text-base font-semibold">
                        {alert.event.amount ? `${alert.event.amount} QUSD` : 'Unknown amount'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnomalyBadge verdict={alert.verdict} size="sm" showScore={alert.score} />
                      <span className="text-xs text-slate-400">
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                  {alert.reasons?.length ? (
                    <div className="grid gap-2 text-xs text-slate-300">
                      {alert.reasons.map((reason) => (
                        <span key={reason} className="rounded-lg border border-slate-700/50 bg-slate-900/70 px-3 py-1">
                          {reason}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
