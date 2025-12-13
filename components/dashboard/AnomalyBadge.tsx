'use client';

import { AnomalyVerdict } from '@/lib/anomaly';

interface Props {
  verdict: AnomalyVerdict;
  size?: 'sm' | 'md';
  showScore?: number | null;
}

const verdictStyles: Record<AnomalyVerdict, { label: string; colors: string }> = {
  CLEAR: { label: 'Clear', colors: 'bg-green-50 text-green-700 border border-green-200' },
  SUSPICIOUS: { label: 'Suspicious', colors: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  ANOMALY: { label: 'Anomaly', colors: 'bg-red-50 text-red-700 border border-red-200' },
};

export default function AnomalyBadge({ verdict, size = 'md', showScore }: Props) {
  const bucket = verdictStyles[verdict] ?? verdictStyles.CLEAR;
  const base = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span className={`${base} ${sizeClasses} ${bucket.colors}`}>
      <span>{bucket.label}</span>
      {typeof showScore === 'number' && <span className="text-[10px] opacity-70">{showScore.toFixed(0)}</span>}
    </span>
  );
}
