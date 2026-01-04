const FINGERPRINT_KEY = 'qie-anomaly-fingerprint';
const ANOMALY_CACHE_KEY = 'qie-anomaly-results';
const WALLET_META_KEY = 'qie-wallet-metadata';
const ATTEMPTS_KEY = 'qie-anomaly-attempts';
const LAST_ANOMALY_KEY = 'qie-last-anomaly';
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

export type AnomalyVerdict = 'CLEAR' | 'SUSPICIOUS' | 'ANOMALY';

export interface AnomalyResult {
  verdict: AnomalyVerdict;
  score: number;
  reasons: string[];
  ipRisk?: Record<string, any>;
}

export interface StoredAnomalyEntry extends AnomalyResult {
  txHash: string;
  recordedAt: number;
  metadata?: Record<string, any>;
}

type StoredAnomalyMap = Record<string, StoredAnomalyEntry>;

type RecentAttemptState = {
  count: number;
  windowStart: number;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse stored JSON', error);
    return fallback;
  }
}

function persist<T>(key: string, payload: T) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn('LocalStorage save failed', error);
  }
}

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const value = window.localStorage.getItem(key);
  return safeParse<T>(value, fallback);
}

function getOrGenerateFingerprint(): string {
  if (!isBrowser()) return 'server-fingerprint';
  const existing = window.localStorage.getItem(FINGERPRINT_KEY);
  if (existing) return existing;
  const generated = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `fp-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(FINGERPRINT_KEY, generated);
  return generated;
}

function getWalletMetadata(wallet: string) {
  if (!wallet) return null;
  const normalized = wallet.toLowerCase();
  const stored = read<Record<string, { walletCreatedAt: string }>>(WALLET_META_KEY, {});
  if (stored[normalized]) {
    return stored[normalized];
  }
  const walletMetadata = { walletCreatedAt: new Date().toISOString() };
  stored[normalized] = walletMetadata;
  persist(WALLET_META_KEY, stored);
  return walletMetadata;
}

function getLocaleCountry() {
  if (!isBrowser()) return null;
  const locale = navigator.language || 'en-US';
  const [_, country] = locale.split('-');
  return country ? country.toUpperCase() : locale.toUpperCase();
}

function incrementRecentAttempts(action: string) {
  if (!isBrowser()) return 1;
  const state = read<Record<string, RecentAttemptState>>(ATTEMPTS_KEY, {});
  const now = Date.now();
  const current = state[action] || { count: 0, windowStart: now };
  if (now - current.windowStart > ATTEMPT_WINDOW_MS) {
    current.count = 0;
    current.windowStart = now;
  }
  current.count += 1;
  state[action] = current;
  persist(ATTEMPTS_KEY, state);
  return current.count;
}

export function getAnomalyStore(): StoredAnomalyMap {
  return read<StoredAnomalyMap>(ANOMALY_CACHE_KEY, {});
}

export function getAnomalyResult(txHash: string) {
  if (!txHash) return null;
  const store = getAnomalyStore();
  return store[txHash] || null;
}

export function getLastAnomalyResult() {
  if (!isBrowser()) return null;
  return read<AnomalyResult | null>(LAST_ANOMALY_KEY, null);
}

function cacheAnomalyValue(txHash: string, entry: StoredAnomalyEntry) {
  const store = getAnomalyStore();
  store[txHash] = entry;
  persist(ANOMALY_CACHE_KEY, store);
  persist(LAST_ANOMALY_KEY, entry);
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent('qie-anomaly-updated', { detail: { txHash } }));
  }
}

export function maskWebhookUrl(url: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const tail = parts[parts.length - 1];
    return `••••/${tail ?? ''}`;
  } catch {
    return '••••';
  }
}

async function fetchFingerprintCount(fingerprint: string) {
  if (!fingerprint) return null;
  try {
    const res = await fetch(`/api/anomaly/fingerprint?fingerprint=${encodeURIComponent(fingerprint)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : null;
  } catch (error) {
    console.warn('Failed to fetch fingerprint count', error);
    return null;
  }
}

async function buildMetadata(params: {
  wallet: string;
  action: 'swap' | 'send';
  targetCurrency?: string | null;
  recipient?: string | null;
  txHash?: string;
}) {
  const fingerprint = getOrGenerateFingerprint();
  const walletMetadata = getWalletMetadata(params.wallet);
  const attempts = incrementRecentAttempts(params.action);
  const fingerprintCount = await fetchFingerprintCount(fingerprint);

  return {
    walletMetadata,
    recentAttempts: attempts,
    fingerprintAssociatedCount: fingerprintCount,
    lastKnownCountry: getLocaleCountry(),
    userAgent: isBrowser() ? navigator.userAgent : null,
    targetCurrency: params.targetCurrency || null,
    recipient: params.recipient || null,
    txHash: params.txHash || null,
  };
}

async function postToAnomaly(body: Record<string, any>) {
  try {
    const res = await fetch('/api/anomaly/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { verdict: 'CLEAR', score: 0, reasons: [] };
    }
    return res.json();
  } catch {
    return { verdict: 'CLEAR', score: 0, reasons: [] };
  }
}

export async function reportAnomalyEvent(params: {
  wallet: string;
  action: 'swap' | 'send';
  amount: number;
  currency: string;
  txHash?: string;
  targetCurrency?: string | null;
  recipient?: string | null;
}) {
  const fingerprint = getOrGenerateFingerprint();
  const metadata = await buildMetadata(params);
  const payload = {
    wallet: params.wallet,
    action: params.action,
    amount: params.amount,
    currency: params.currency,
    fingerprint,
    metadata,
    arrivedAt: new Date().toISOString(),
  };

  const result: AnomalyResult = await postToAnomaly(payload);

  if (params.txHash) {
    cacheAnomalyValue(params.txHash, {
      ...result,
      txHash: params.txHash,
      recordedAt: Date.now(),
      metadata,
    });
  }

  return result;
}

export function subscribeToAnomalyUpdates(callback: () => void) {
  if (!isBrowser()) return () => undefined;
  const handler = () => callback();
  window.addEventListener('qie-anomaly-updated', handler);
  return () => window.removeEventListener('qie-anomaly-updated', handler);
}

