'use client';

import { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import { useWeb3 } from '@/contexts/Web3Provider';
import { toast } from 'react-hot-toast';

const CONSENT_STORAGE_KEY = 'qieremit_consent_given';
const CONSENT_VERSION = 'v1.0';

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { account, isConnected } = useWeb3();

  useEffect(() => {
    // Check if consent has been given
    const consentGiven = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!consentGiven) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = async () => {
    try {
      // Save to localStorage
      localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      localStorage.setItem(`${CONSENT_STORAGE_KEY}_version`, CONSENT_VERSION);
      localStorage.setItem(`${CONSENT_STORAGE_KEY}_timestamp`, new Date().toISOString());

      // If wallet is connected, update the database
      if (isConnected && account) {
        try {
          const response = await fetch('/api/user/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: account,
              hasConsentedToPrivacyPolicy: true,
              consentVersion: CONSENT_VERSION,
            }),
          });

          if (!response.ok) {
            console.warn('Failed to save consent to database, but saved locally');
          }
        } catch (error) {
          console.warn('Error saving consent to database:', error);
          // Don't block the user - consent is saved locally
        }
      }

      setShowBanner(false);
      toast.success('Privacy preferences saved');
    } catch (error) {
      console.error('Error accepting consent:', error);
      toast.error('Failed to save consent');
    }
  };

  const handleDecline = () => {
    // Redirect to Google as specified
    window.location.href = 'https://www.google.com/search?q=google.com';
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Privacy & Cookie Consent
              </h3>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                We use cookies and store your wallet address for compliance and security purposes. 
                By continuing, you agree to our Privacy Policy and Terms of Service. 
                Your data is protected under GDPR and DPDP regulations.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAccept}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 rounded-xl font-semibold text-white transition-all shadow-sm hover:shadow-md"
                >
                  Accept
                </button>
                <button
                  onClick={handleDecline}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 transition-all"
                >
                  Decline
                </button>
                <a
                  href="#"
                  className="px-6 py-2.5 text-gray-600 hover:text-gray-900 text-sm underline font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    // You can add a privacy policy page later
                    toast.info('Privacy Policy page coming soon');
                  }}
                >
                  Learn More
                </a>
              </div>
            </div>
            
            <button
              onClick={() => setShowBanner(false)}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
