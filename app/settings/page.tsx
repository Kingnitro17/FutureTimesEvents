'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { User, Palette, Bell, AlertTriangle, Mail, Smartphone, Globe, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

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
  { id: 'danger',  icon: AlertTriangle, label: 'Danger Zone'     },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

export default function SettingsPage() {
  const { user, isLoading, retryProfile } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [dark, setDark] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.name);
    setBio(user.bio || '');
    setLocation(user.location || '');
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const cleanName = displayName.trim();
    if (!cleanName) {
      toast.error('Your display name cannot be empty.');
      return;
    }

    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: cleanName,
        initials: cleanName.slice(0, 2).toUpperCase(),
        bio: bio.trim(),
        location: location.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Could not update your profile. Please try again.');
    } else {
      await retryProfile();
      toast.success('Profile updated successfully.');
    }
    setSaving(false);
  };

  if (isLoading) return <div className="min-h-screen grid place-items-center"><div className="w-9 h-9 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" /></div>;
  if (!user) return <div className="page-offset min-h-screen grid place-items-center p-6 text-center"><div><h1 className="type-h2">Sign in to manage your account</h1><Link href="/login" className="btn btn-grad text-white mt-5">Sign in</Link></div></div>;

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
                        {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : <User size={32} className="text-[var(--text-muted)]" />}
                      </div>
                      <div className="space-y-2">
                        <Link href="/profile" className="btn btn-sm btn-outline">Change Avatar</Link>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5 mb-6">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-[var(--text)]">Display Name</label>
                        <input type="text" value={displayName} onChange={event => setDisplayName(event.target.value)} className="input" required />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-[var(--text)]">Email Address</label>
                        <input type="email" value={user.email} className="input opacity-75" readOnly />
                        <p className="text-xs text-[var(--text-muted)]">Your verified sign-in email is managed by Supabase Auth.</p>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2"><MapPin size={14} /> Location</label>
                        <input type="text" value={location} onChange={event => setLocation(event.target.value)} placeholder="Harare, Zimbabwe" className="input" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-sm font-medium text-[var(--text)]">Bio</label>
                        <textarea rows={3} value={bio} onChange={event => setBio(event.target.value)} placeholder="Tell people a little about yourself" className="input resize-none py-3" />
                      </div>
                    </div>
                    
                    <div className="flex justify-end border-t border-[var(--border)] pt-6">
                      <button onClick={() => void handleSave()} disabled={saving} className="btn btn-md btn-primary disabled:opacity-60">{saving ? 'Saving…' : 'Save Changes'}</button>
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
