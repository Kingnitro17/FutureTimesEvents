'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Settings2 } from 'lucide-react';

export default function CookieConsent() {
  const [visible,  setVisible]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: true, marketing: false });

  useEffect(() => {
    const stored = localStorage.getItem('fte-cookies');
    if (!stored) setTimeout(() => setVisible(true), 1200);
  }, []);

  const accept = (all = true) => {
    localStorage.setItem('fte-cookies', JSON.stringify(
      all ? { analytics: true, marketing: true, necessary: true } : { ...prefs, necessary: true }
    ));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="fixed bottom-6 left-4 right-4 z-[999] max-w-xl mx-auto"
        >
          <div className="rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(13,13,26,0.92)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(114,34,227,0.15)',
            }}>

            {/* Gradient top accent */}
            <div className="h-[2px]" style={{ background: 'linear-gradient(90deg,#FF55C2,#7222E3,#2CC4EA)' }} />

            <div className="p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                    <Cookie size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">We use cookies 🍪</p>
                    <p className="text-white/50 text-xs">To give you the best experience</p>
                  </div>
                </div>
                <button onClick={() => setVisible(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 shrink-0 mt-0.5"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={14} />
                </button>
              </div>

              <p className="text-white/60 text-xs leading-relaxed mb-5">
                We use essential cookies to make our site work. With your consent, we may use analytics and marketing cookies to improve your experience and show you relevant events near you.
              </p>

              {/* Expandable preferences */}
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="overflow-hidden mb-5">
                    <div className="space-y-3 py-1">
                      {[
                        { key: 'necessary', label: 'Necessary', desc: 'Required for the site to function', locked: true },
                        { key: 'analytics', label: 'Analytics', desc: 'Help us understand how you use the site', locked: false },
                        { key: 'marketing', label: 'Marketing', desc: 'Show you personalised event suggestions', locked: false },
                      ].map(({ key, label, desc, locked }) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <p className="text-white text-xs font-bold">{label} {locked && <span className="text-white/30">(required)</span>}</p>
                            <p className="text-white/40 text-xs">{desc}</p>
                          </div>
                          <button
                            disabled={locked}
                            onClick={() => !locked && setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                            className={`relative w-10 h-5 rounded-full transition-all ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{ background: (locked || prefs[key as keyof typeof prefs]) ? 'linear-gradient(135deg,#FF55C2,#7222E3)' : 'rgba(255,255,255,0.15)' }}>
                            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                              style={{ left: (locked || prefs[key as keyof typeof prefs]) ? '1.25rem' : '0.125rem' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => accept(true)}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', boxShadow: '0 4px 16px rgba(114,34,227,0.35)' }}>
                  Accept All
                </button>
                <button onClick={() => expanded ? accept(false) : setExpanded(true)}
                  className="flex-1 py-2.5 rounded-xl text-white/70 text-sm font-semibold flex items-center justify-center gap-1.5 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Settings2 size={13} />
                  {expanded ? 'Save Preferences' : 'Manage Cookies'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
