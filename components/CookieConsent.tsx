'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, Shield, ChevronRight, Lock, Check } from 'lucide-react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'fte_cookie_consent';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  accepted: boolean;
  timestamp: string;
}

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    accepted: false,
    timestamp: '',
  });

  useEffect(() => {
    // Check if user has already given consent
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      setIsVisible(true);
    } else {
      setPreferences(JSON.parse(stored));
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    const consent = { ...prefs, accepted: true, timestamp: new Date().toISOString() };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setPreferences(consent);
    setIsVisible(false);

    // Apply consent settings
    if (consent.analytics) {
      // Enable analytics cookies
      document.cookie = 'fte_analytics=enabled; path=/; max-age=31536000; SameSite=Lax';
    }
    if (consent.marketing) {
      // Enable marketing cookies
      document.cookie = 'fte_marketing=enabled; path=/; max-age=31536000; SameSite=Lax';
    }
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      accepted: true,
      timestamp: '',
    });
  };

  const acceptSelected = () => {
    saveConsent(preferences);
  };

  const rejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      accepted: true,
      timestamp: '',
    });
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-6 sm:p-10 lg:p-14"
      >
        <div className="max-w-2xl mx-auto">
          {!showDetails ? (
            <div 
              className="rounded-3xl p-7 md:p-10 shadow-2xl relative overflow-hidden"
              style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Gradient glow effect */}
              <div 
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
                style={{ background: 'var(--accent)' }}
              />
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 relative">
                {/* Lock Icon */}
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center" 
                  style={{ 
                    background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <Lock size={28} className="text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Gradient Title */}
                  <h3 
                    className="font-bold text-lg mb-1"
                    style={{ 
                      background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    We value your privacy
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
                    Future Times Events uses cookies to keep you signed in, remember your preferences, and improve your experience. See our{' '}
                    <Link 
                      href="/privacy-policy" 
                      className="font-medium hover:underline transition-all"
                      style={{ 
                        color: 'var(--accent)',
                        textShadow: '0 0 20px rgba(114, 34, 227, 0.3)'
                      }}
                    >
                      Privacy Policy
                    </Link>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setShowDetails(true)}
                    className="flex-1 md:flex-none px-6 py-4 rounded-full text-base font-medium transition-all duration-200 border"
                    style={{ 
                      background: 'transparent',
                      borderColor: 'var(--border)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    Customize
                  </button>
                  <button
                    onClick={rejectAll}
                    className="flex-1 md:flex-none px-6 py-4 rounded-full text-base font-medium transition-all duration-200 border"
                    style={{ 
                      background: 'transparent',
                      borderColor: 'var(--border)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={acceptAll}
                    className="flex-1 md:flex-none px-8 py-4 rounded-full text-base font-bold text-white transition-all duration-200 flex items-center justify-center gap-2"
                    style={{ 
                      background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                      boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)'
                    }}
                  >
                    <Check size={20} strokeWidth={3} />
                    Accept All
                  </button>
                </div>
              </div>
            </div>
          ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield size={24} style={{ color: 'var(--accent)' }} />
                    <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
                      Cookie Preferences
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Necessary - Always on */}
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div>
                      <h4 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>Necessary</h4>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Essential for the website to function properly</p>
                    </div>
                    <div className="w-11 h-6 rounded-full bg-green-500 flex items-center px-0.5">
                      <div className="w-5 h-5 rounded-full bg-white shadow-sm translate-x-5" />
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div>
                      <h4 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>Analytics</h4>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Helps us understand how visitors interact with our website</p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className="w-11 h-6 rounded-full p-0.5 transition-colors"
                      style={{ background: preferences.analytics ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                    >
                      <div 
                        className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                        style={{ transform: preferences.analytics ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>

                  {/* Marketing */}
                  <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <div>
                      <h4 className="font-semibold text-sm mb-0.5" style={{ color: 'var(--text)' }}>Marketing</h4>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Used to deliver personalized advertisements</p>
                    </div>
                    <button
                      onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                      className="w-11 h-6 rounded-full p-0.5 transition-colors"
                      style={{ background: preferences.marketing ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                    >
                      <div 
                        className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                        style={{ transform: preferences.marketing ? 'translateX(20px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Link 
                    href="/privacy-policy"
                    className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all"
                    style={{ color: 'var(--accent)' }}
                  >
                    Privacy Policy <ChevronRight size={14} />
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDetails(false)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text)' }}
                    >
                      Back
                    </button>
                    <button
                      onClick={acceptSelected}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ background: 'var(--accent)' }}
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
      </motion.div>
    </AnimatePresence>
  );
}
