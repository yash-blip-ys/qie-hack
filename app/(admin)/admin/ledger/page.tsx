'use client';

import { useEffect, useMemo, useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { getExplorerUrl } from '@/config';
import { ExternalLink } from 'lucide-react';

interface TransferRow {
  txHash: string;
  status: 'pending' | 'completed' | 'failed';
  sender: string;
  recipient: string | null;
  amountQUSD: string;
  timestamp: number;
  type: 'cross-border' | 'swap';
  risk?: { verdict: 'CLEAR' | 'SUSPICIOUS' | 'ANOMALY'; score?: number } | null;
}

export default function AdminLedgerPage() {
  const [data, setData] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(false);
  const explorer = useMemo(() => getExplorerUrl(), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tRes, aRes] = await Promise.all([
          fetch('/api/transfers?limit=50'),
          fetch('/api/anomaly/alerts?limit=50'),
        ]);
        const tPayload = await tRes.json();
        const aPayload = await aRes.json();
        const alerts: Array<any> = aPayload.data || [];
        const riskByWallet: Record<string, { verdict: 'CLEAR' | 'SUSPICIOUS' | 'ANOMALY'; score?: number }> = {};
        for (const alert of alerts) {
          if (alert?.event?.wallet) {
            riskByWallet[alert.event.wallet.toLowerCase()] = { verdict: alert.verdict, score: alert.score };
          }
        }
        const rows: TransferRow[] = (tPayload.data || []).map((t: any) => ({
          txHash: t.txHash,
          status: t.status,
          sender: t.sender,
          recipient: t.recipient,
          amountQUSD: t.amountQUSD,
          timestamp: t.timestamp,
          type: t.type,
          risk: riskByWallet[t.sender?.toLowerCase()] || null,
        }));
        setData(rows);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const columns: ColumnDef<TransferRow>[] = [
    {
      header: 'Hash',
      accessorKey: 'txHash',
      cell: ({ getValue }) => {
        const h = getValue() as string;
        return (
          <a
            className="text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 font-mono text-xs"
            href={`${explorer}/tx/${h}`}
            target="_blank"
            rel="noreferrer"
          >
            {h.slice(0, 10)}… <ExternalLink className="w-3 h-3" />
          </a>
        );
      },
    },
    { header: 'Type', accessorKey: 'type' },
    { header: 'Amount (QUSD)', accessorKey: 'amountQUSD' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ getValue }) => {
        const s = getValue() as TransferRow['status'];
        const cls =
          s === 'completed'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : s === 'failed'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse';
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${cls}`}>{s}</span>;
      },
    },
    {
      header: 'Risk',
      accessorKey: 'risk',
      cell: ({ row }) => {
        const risk = row.original.risk;
        if (!risk) return <span className="text-xs text-gray-500">—</span>;
        const cls =
          risk.verdict === 'ANOMALY'
            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
            : risk.verdict === 'SUSPICIOUS'
            ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
            : 'bg-green-500/10 text-green-300 border border-green-500/20';
        return (
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1 ${cls}`}>
            {risk.verdict}
            {typeof risk.score === 'number' ? <span className="opacity-70">({risk.score})</span> : null}
          </div>
        );
      },
    },
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: ({ getValue }) => {
        const ts = getValue() as number;
        return <span className="text-xs text-gray-300">{new Date(ts).toLocaleString()}</span>;
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">On-Chain Ledger</h1>
        <p className="text-sm text-gray-400">Live transaction table with optimistic UI</p>
      </div>
      <div className="glass-card rounded-2xl p-6 bg-white/5 border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="text-left text-gray-400">
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2 font-semibold">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-400" colSpan={columns.length}>
                    Loading…
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-3">
                        {cell.column.columnDef.cell
                          ? flexRender(cell.column.columnDef.cell, cell.getContext())
                          : String(cell.getValue() ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
