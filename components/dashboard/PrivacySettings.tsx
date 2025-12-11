'use client';

import { useState } from 'react';
import { Shield, Download, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function PrivacySettings() {
  const { account, disconnectWallet } = useWeb3();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleExportData = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`/api/user/data-rights?address=${account}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export data');
      }

      const data = await response.json();
      
      // Create a blob and trigger download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${account.slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Your data has been exported successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/user/data-rights', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: account }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete data');
      }

      const data = await response.json();
      
      // Clear local storage
      localStorage.removeItem('qieremit_consent_given');
      localStorage.removeItem('qieremit_consent_given_version');
      localStorage.removeItem('qieremit_consent_given_timestamp');

      // Disconnect wallet
      disconnectWallet();

      toast.success('Your off-chain data has been permanently deleted');
      
      // Redirect to landing page
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete data');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="backdrop-blur-sm bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold">Data Privacy & Rights (GDPR/DPDP)</h3>
        </div>

        <div className="space-y-4">
          <p className="text-slate-400 text-sm mb-6">
            You have the right to access, export, and delete your personal data stored in our 
            off-chain database. On-chain transactions on the Qie blockchain are immutable and 
            cannot be deleted.
          </p>

          {/* Export Data Section */}
          <div className="border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-cyan-400" />
                <h4 className="font-medium">Export Your Data</h4>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Download a JSON file containing all your off-chain data (wallet address, KYC status, 
              consent records, timestamps).
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting || !account}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Data (JSON)
                </>
              )}
            </button>
          </div>

          {/* Delete Account Section */}
          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h4 className="font-medium text-red-400">Delete Account Data</h4>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Permanently delete your KYC status and wallet address linkage from our off-chain database. 
              This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting || !account}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2 text-white"
            >
              <Trash2 className="w-4 h-4" />
              Delete Off-Chain Data
            </button>
          </div>

          {/* Compliance Info */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-500">
                <p className="mb-2">
                  <strong className="text-slate-400">GDPR & DPDP Compliance:</strong> This application 
                  implements a Hybrid Data Architecture to comply with data protection regulations.
                </p>
                <p>
                  <strong className="text-slate-400">On-Chain Data:</strong> Transaction hashes and 
                  value transfers are stored on the immutable Qie blockchain and cannot be deleted 
                  (exempt under &lsquo;legitimate interest&rsquo;).
                </p>
                <p className="mt-2">
                  <strong className="text-slate-400">Off-Chain Data:</strong> Personal identifiers 
                  (wallet-to-KYC linkage) are stored in MongoDB and can be deleted upon request, 
                  effectively anonymizing on-chain records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="backdrop-blur-lg bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Confirm Data Deletion</h3>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-slate-300">
                This will permanently delete your KYC status and wallet address linkage from our 
                off-chain database.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Important:</strong> Your on-chain transaction history on the Qie blockchain 
                    is permanent and cannot be deleted. Only off-chain data (KYC status, wallet linkage) 
                    will be removed.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-white flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

