'use client';

import { AnomalyVerdict } from '@/lib/anomaly';

interface Props {
  verdict: AnomalyVerdict;
  size?: 'sm' | 'md';
  showScore?: number | null;
}

const verdictStyles: Record<AnomalyVerdict, { label: string; colors: string }> = {
  CLEAR: { label: 'Clear', colors: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  SUSPICIOUS: { label: 'Suspicious', colors: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  ANOMALY: { label: 'Anomaly', colors: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

export default function AnomalyBadge({ verdict, size = 'md', showScore }: Props) {
  const bucket = verdictStyles[verdict] ?? verdictStyles.CLEAR;
  const base = 'inline-flex items-center gap-1 rounded-full font-medium';
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`${base} ${sizeClasses} ${bucket.colors}`}>
      <span>{bucket.label}</span>
      {typeof showScore === 'number' && <span className="opacity-70 ml-1">({showScore.toFixed(0)})</span>}
    </span>
  );
}
