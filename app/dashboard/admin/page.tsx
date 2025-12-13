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
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Admin Console</p>
            <h1 className="text-2xl font-bold text-gray-900">Anomaly Alerts</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-1 font-semibold"
            >
              <LinkIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <button
              onClick={handlePingWebhook}
              disabled={isPingingWebhook}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:opacity-60"
            >
              {isPingingWebhook ? 'Pinging...' : 'Ping Webhook'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="card-elevated rounded-2xl p-5 border border-gray-200 bg-white space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Latest Webhook</p>
            <p className="text-lg font-bold text-gray-900">
              {webhookStatus?.enabled ? 'Connected' : 'Not configured'}
            </p>
            <p className="text-xs text-gray-500">{webhookStatus?.webhook || 'No webhook provided'}</p>
          </div>
          <div className="card-elevated rounded-2xl p-5 border border-gray-200 bg-white space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Alerts cached</p>
            <p className="text-lg font-bold text-gray-900">{alerts.length}</p>
            <p className="text-xs text-gray-500">Updated every 15s</p>
          </div>
          <div className="card-elevated rounded-2xl p-5 border border-gray-200 bg-white space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Health</p>
            <p className="text-lg font-bold text-gray-900">{loading ? 'Refreshing…' : 'Idle'}</p>
            <p className="text-xs text-gray-500">{loading ? 'Fetching alerts' : 'Queue is healthy'}</p>
          </div>
        </div>

        <section className="card-elevated rounded-2xl p-5 border border-gray-200 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Detection Events</h2>
              <p className="text-sm text-gray-600">Powered by the anomaly middleware queue</p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                Refreshing
              </div>
            )}
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">No alerts yet. Trigger a transfer or swap to start logging.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className="flex flex-col gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-600">
                        {alert.event.action === 'swap' ? 'Swap' : 'Transfer'} · {formatAddress(alert.event.wallet)}
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        {alert.event.amount ? `${alert.event.amount} QUSD` : 'Unknown amount'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnomalyBadge verdict={alert.verdict} size="sm" showScore={alert.score} />
                      <span className="text-xs text-gray-500">
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                  {alert.reasons?.length ? (
                    <div className="grid gap-2 text-xs">
                      {alert.reasons.map((reason) => (
                        <span key={reason} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700">
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
