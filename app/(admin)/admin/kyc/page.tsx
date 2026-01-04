'use client';

import { useEffect, useMemo, useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { getExplorerUrl } from '@/config';

interface KycRow {
  walletAddress: string;
  isKycVerified: boolean;
  kycTimestamp: string | number | Date | null;
}

export default function AdminKycPage() {
  const [data, setData] = useState<KycRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const explorer = useMemo(() => getExplorerUrl(), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/kyc/list?limit=100');
        const payload = await res.json();
        setData(payload.data || []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const approveOne = async (walletAddress: string) => {
    try {
      const res = await fetch('/api/admin/kyc/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      if (res.ok) {
        setData((prev) => prev.filter((u) => u.walletAddress.toLowerCase() !== walletAddress.toLowerCase()));
      }
    } catch {}
  };

  const approveAll = async () => {
    try {
      setApprovingAll(true);
      const res = await fetch('/api/admin/kyc/approve-all', { method: 'POST' });
      if (res.ok) {
        setData([]);
      }
    } catch {
    } finally {
      setApprovingAll(false);
    }
  };

  const columns: ColumnDef<KycRow>[] = [
    {
      header: 'Wallet',
      accessorKey: 'walletAddress',
      cell: ({ getValue }) => {
        const addr = getValue() as string;
        return (
          <a
            className="text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1 font-mono text-xs"
            href={`${explorer}/address/${addr}`}
            target="_blank"
            rel="noreferrer"
          >
            {addr}
          </a>
        );
      },
    },
    {
      header: 'Submitted',
      accessorKey: 'kycTimestamp',
      cell: ({ getValue }) => {
        const ts = getValue() as number | string | Date | null;
        const d = ts ? new Date(ts) : null;
        return <span className="text-xs text-gray-300">{d ? d.toLocaleString() : '—'}</span>;
      },
    },
    {
      header: 'Actions',
      accessorKey: 'walletAddress',
      cell: ({ getValue }) => {
        const addr = getValue() as string;
        return (
          <button
            onClick={() => approveOne(addr)}
            className="px-2 py-1 rounded bg-green-500/20 border border-green-500/30 text-green-200 text-[11px]"
          >
            Approve
          </button>
        );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">KYC Approvals</h1>
          <p className="text-sm text-gray-400">Review and approve pending identities</p>
        </div>
        <button
          onClick={approveAll}
          className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm disabled:opacity-50"
          disabled={approvingAll || data.length === 0}
        >
          {approvingAll ? 'Approving…' : `Approve All (${data.length})`}
        </button>
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
