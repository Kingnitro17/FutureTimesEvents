'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { User, Palette, Bell, Link2, AlertTriangle, Check, Mail, Smartphone, Globe, CreditCard } from 'lucide-react';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200"
      style={{ background: value ? 'linear-gradient(135deg,#FF55C2,#7222E3)' : 'var(--bg-tertiary)' }}
      aria-checked={value} role="switch"
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        style={{ left: value ? 26 : 4 }}
      />
    </motion.button>
  );
}

const SECTIONS = [
  { id: 'profile', icon: User,          label: 'Profile'         },
  { id: 'appear',  icon: Palette,       label: 'Appearance'      },
  { id: 'notif',   icon: Bell,          label: 'Notifications'   },
  { id: 'billing', icon: CreditCard,    label: 'Billing'         },
  { id: 'linked',  icon: Link2,         label: 'Linked Accounts' },
  { id: 'danger',  icon: AlertTriangle, label: 'Danger Zone'     },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [dark, setDark] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen page-offset pb-24" style={{ background: 'var(--bg-secondary)' }}>
      <div className="container max-w-5xl py-8 sm:py-10 px-4 sm:px-6 lg:px-8">

        <motion.div {...fadeUp(0)} className="mb-8">
          <h1 className="type-h1 text-[var(--text)] mb-2">Settings</h1>
          <p className="type-sm text-[var(--text-muted)]">Manage your account preferences and settings.</p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">

          {/* Sidebar Nav - Horizontal scroll on mobile, sticky sidebar on desktop */}
          <motion.div {...fadeUp(0.05)} className="w-full md:w-64 shrink-0">
            <div className="card rounded-2xl p-2 md:sticky md:top-[calc(var(--nav-h)+24px)] overflow-x-auto scrollbar-hide">
              <div className="flex md:flex-col gap-1 min-w-max md:min-w-0">
                {SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-2 md:gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      activeSection === sec.id
                        ? 'bg-[var(--bg-secondary)] text-[var(--text)] shadow-sm'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text)]'
                    }`}
                  >
                    <sec.icon size={16} className={activeSection === sec.id ? 'text-[var(--accent)]' : ''} />
                    {sec.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Content Area */}
          <div className="flex-1 space-y-6">

            <AnimatePresence mode="wait">
              {activeSection === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Profile Details</h2>
                    
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-20 h-20 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] flex items-center justify-center overflow-hidden">
                        <User size={32} className="text-[var(--text-muted)]" />
                      </div>
                      <div className="space-y-2">
                        <button className="btn btn-sm btn-outline">Change Avatar</button>
                        <button className="btn btn-sm btn-ghost text-red-500 hover:text-red-600">Remove</button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5 mb-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--text)]">First Name</label>
                        <input type="text" defaultValue="Alex" className="input" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--text)]">Last Name</label>
                        <input type="text" defaultValue="Johnson" className="input" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-[var(--text)]">Email Address</label>
                        <input type="email" defaultValue="alex@eventsdistro.com" className="input" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-[var(--text)]">Bio</label>
                        <textarea rows={3} defaultValue="Music lover, night owl, festival addict." className="input resize-none py-3" />
                      </div>
                    </div>
                    
                    <div className="flex justify-end border-t border-[var(--border)] pt-6">
                      <button onClick={handleSave} className="btn btn-md btn-primary">Save Changes</button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'appear' && (
                <motion.div key="appear" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Appearance</h2>
                    
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] mb-4">
                      <div>
                        <p className="font-semibold text-[var(--text)]">Dark Mode</p>
                        <p className="text-sm text-[var(--text-muted)]">Toggle dark mode theme</p>
                      </div>
                      <Toggle value={dark} onChange={(v) => {
                        setDark(v);
                        document.documentElement.classList.toggle('dark', v);
                        localStorage.setItem('ed-theme', v ? 'dark' : 'light');
                      }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'notif' && (
                <motion.div key="notif" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Notifications</h2>
                    
                    <div className="space-y-3">
                      {[
                        { id: 'email', icon: Mail, title: 'Email Notifications', desc: 'Receive updates, promotions, and tickets via email.', state: notifEmail, set: setNotifEmail },
                        { id: 'push', icon: Globe, title: 'Push Notifications', desc: 'Get browser push notifications for important updates.', state: notifPush, set: setNotifPush },
                        { id: 'sms', icon: Smartphone, title: 'SMS Alerts', desc: 'Receive text messages for last-minute event changes.', state: notifSMS, set: setNotifSMS },
                      ].map((n) => (
                        <div key={n.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] shrink-0">
                              <n.icon size={16} className="text-[var(--text)]" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-[var(--text)]">{n.title}</p>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.desc}</p>
                            </div>
                          </div>
                          <div className="shrink-0 self-end sm:self-auto">
                            <Toggle value={n.state} onChange={n.set} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection === 'danger' && (
                <motion.div key="danger" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8 border-red-500/20">
                    <h2 className="type-h3 text-red-500 mb-6 flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h2>
                    
                    <div className="p-5 rounded-xl border border-red-500/20 bg-red-50 mb-5">
                      <h4 className="font-semibold text-red-600 mb-1">Delete Account</h4>
                      <p className="text-sm text-red-500/80 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                      <button className="btn btn-sm btn-danger">Delete Account</button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
