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
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-cyan-900/20 rounded-xl flex items-center justify-center border border-cyan-500/20">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Data Privacy & Rights</h3>
            <p className="text-xs text-gray-400">Manage your personal data stored off-chain</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Export Data */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-500/30 transition-colors group">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="p-2 bg-white/10 rounded-lg text-gray-400 group-hover:text-cyan-400 transition-colors">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Export Your Data</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Download a copy of all your off-chain transaction metadata and profile info.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting || !account}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-medium text-white rounded-lg transition-colors border border-white/10 disabled:opacity-50"
              >
                {isExporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          </div>

          {/* Delete Data */}
          <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-xl hover:border-red-500/30 transition-colors group">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="p-2 bg-red-900/20 rounded-lg text-red-400 group-hover:text-red-300 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-200">Delete Account Data</h4>
                  <p className="text-xs text-red-400/60 mt-1 max-w-xs">
                    Permanently remove all off-chain data associated with your wallet address.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting || !account}
                className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-xs font-medium text-red-300 rounded-lg transition-colors border border-red-900/50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/10 rounded-lg border border-blue-900/20">
            <Lock className="w-3 h-3 text-blue-400" />
            <p className="text-[10px] text-blue-300/80">
              Your on-chain data (transactions on QIE blockchain) cannot be deleted as the blockchain is immutable.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Delete all data?</h3>
            </div>
            
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              This action <span className="font-bold text-white">cannot be undone</span>. 
              We will permanently delete your user profile, settings, and off-chain transaction history metadata.
              <br /><br />
              You will be disconnected immediately.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-red-900/20"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
