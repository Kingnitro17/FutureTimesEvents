'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getUserTickets, getEvents } from '@/lib/queries';
import { MOCK_USER, MOCK_EVENTS, MOCK_TICKETS } from '@/lib/mockData';
import { MapPin, Calendar, Star, User, Loader2 } from 'lucide-react';
import EventDateBadge from '@/components/events/EventDateBadge';
import type { Ticket, Event } from '@/types';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

export default function ProfilePage() {
  const [profile,    setProfile]    = useState<any>(MOCK_USER);
  const [tickets,    setTickets]    = useState<Ticket[]>(MOCK_TICKETS);
  const [saved,      setSaved]      = useState<Event[]>(MOCK_EVENTS.slice(3, 7));
  const [loading,    setLoading]    = useState(true);
  const [activeTab, setActiveTab]   = useState<'tickets'|'saved'|'badges'>('tickets');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Fetch real profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (prof) {
        setProfile({
          ...MOCK_USER,
          id: prof.id,
          name: prof.display_name || session.user.email?.split('@')[0] || 'User',
          email: prof.email,
          avatar: prof.avatar_url || '',
          avatarColor: prof.avatar_color || '#7222E3',
          initials: prof.initials || 'U',
          bio: prof.bio || '',
          location: prof.location || 'Harare, Zimbabwe',
          loyaltyPoints: prof.loyalty_points || 0,
          eventsAttended: prof.events_attended || 0,
          totalSpent: parseFloat(prof.total_spent) || 0,
          isVip: prof.is_vip || false,
          role: prof.role || 'user',
        });
      }

      // Fetch real tickets
      const tkts = await getUserTickets(session.user.id);
      if (tkts.length > 0) setTickets(tkts);

      // Fetch saved events
      const { data: savedRows } = await supabase
        .from('saved_events')
        .select('events(*, ticket_tiers(*))')
        .eq('user_id', session.user.id)
        .limit(8);
      if (savedRows && savedRows.length > 0) {
        const { transformEvent } = await import('@/lib/queries');
        setSaved(savedRows.map((r: any) => transformEvent(r.events)));
      }

      setLoading(false);
    }
    load();
  }, []);

  const loyaltyLevel = profile.loyaltyPoints >= 3000 ? 'Platinum' : profile.loyaltyPoints >= 1500 ? 'Gold' : 'Silver';
  const loyaltyColor = loyaltyLevel === 'Platinum' ? '#DD1FFF' : loyaltyLevel === 'Gold' ? '#FFBC73' : '#2CC4EA';
  const nextLevel    = loyaltyLevel === 'Silver' ? 1500 : loyaltyLevel === 'Gold' ? 3000 : 5000;
  const progress     = Math.min((profile.loyaltyPoints / nextLevel) * 100, 100);

  const tabs: { id: 'tickets'|'saved'|'badges'; label: string }[] = [
    { id: 'tickets', label: '🎟️ Tickets' },
    { id: 'saved',   label: '❤️ Saved'   },
    { id: 'badges',  label: '🏅 Badges'  },
  ];

  if (loading) return (
    <div className="min-h-screen page-offset flex items-center justify-center">
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="min-h-screen page-offset pb-24" style={{ background: 'var(--bg-secondary)' }}>

      {/* Cover banner */}
      <div className="relative h-44 sm:h-56 overflow-hidden animate-stripe" />

      {/* Profile card */}
      <div className="container">
        <div className="-mt-14 mb-8">
          <motion.div {...fadeUp(0.05)} className="card rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">

              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white dark:border-[var(--bg)] flex items-center justify-center shrink-0 shadow-lg text-white text-2xl font-black"
                style={{ background: profile.avatarColor || 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                {profile.initials || <User size={36} />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="type-h2 text-[var(--text)]">{profile.name}</h1>
                  {profile.isVip && <span className="badge badge-grad">👑 VIP</span>}
                  <span className="badge" style={{ background: `linear-gradient(135deg,${loyaltyColor},#533885)`, color:'#fff' }}>{loyaltyLevel}</span>
                </div>
                <p className="type-sm text-[var(--text-muted)] mb-2 line-clamp-2">{profile.bio || 'Event enthusiast based in Zimbabwe 🇿🇼'}</p>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><MapPin size={11} />{profile.location}</span>
                  <span className="flex items-center gap-1"><Calendar size={11} />Member since {new Date(profile.joinedAt || Date.now()).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span>
                </div>
              </div>

              {/* Edit */}
              <Link href="/settings" className="btn btn-sm btn-ghost shrink-0 self-start sm:self-auto">
                Edit Profile
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div {...fadeUp(0.1)} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: '🎟️', val: profile.eventsAttended, label: 'Events Attended' },
            { icon: '💰', val: `$${profile.totalSpent.toLocaleString()}`, label: 'Total Spent' },
            { icon: '⭐', val: profile.loyaltyPoints.toLocaleString(), label: 'Loyalty Pts' },
            { icon: '🏅', val: profile.badges?.filter((b: any) => b.earned).length || 0, label: 'Badges' },
          ].map(({ icon, val, label }) => (
            <div key={label} className="card rounded-2xl p-4 sm:p-5 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="type-h3 text-[var(--text)] mb-0.5">{val}</div>
              <div className="type-caption text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Loyalty progress */}
        <motion.div {...fadeUp(0.15)} className="card rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-[var(--text)] flex items-center gap-1.5"><Star size={14} /> Loyalty Progress</span>
            <span className="type-caption text-[var(--text-muted)]">
              {profile.loyaltyPoints.toLocaleString()} / {nextLevel.toLocaleString()} pts to {loyaltyLevel === 'Silver' ? 'Gold' : loyaltyLevel === 'Gold' ? 'Platinum' : 'Elite'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg,${loyaltyColor},#533885)` }}
            />
          </div>
          <div className="flex justify-between mt-2 type-caption text-[var(--text-muted)]">
            {['Silver','Gold (1.5k)','Platinum (3k)','Elite (5k)'].map(l => <span key={l}>{l}</span>)}
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeUp(0.2)} className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`btn btn-sm transition-all ${activeTab === tab.id ? 'btn-grad text-white' : 'btn-ghost'}`}>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tickets tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="card rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">🎟️</div>
                <p className="type-h3 text-[var(--text)] mb-2">No tickets yet</p>
                <Link href="/events" className="btn btn-md btn-grad text-white">Browse Events</Link>
              </div>
            ) : tickets.map((t, i) => (
              <motion.div key={t.id} {...fadeUp(i * 0.06)}
                className="card rounded-xl p-4 flex items-center gap-4">
                <img src={t.event.image} alt={t.event.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                <div className="shrink-0 hidden sm:block">
                  <EventDateBadge date={t.event.date} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-[var(--text)] line-clamp-2 leading-snug">{t.event.title}</p>
                  <p className="type-caption text-[var(--text-muted)] mt-1">{t.tier.name}</p>
                </div>
                <span className={`badge ${t.status === 'upcoming' ? 'badge-success' : ''}`}>{t.status}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Saved tab */}
        {activeTab === 'saved' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {saved.length === 0 ? (
              <div className="card rounded-2xl p-10 text-center col-span-2">
                <div className="text-4xl mb-3">❤️</div>
                <p className="type-h3 text-[var(--text)] mb-2">No saved events</p>
                <Link href="/events" className="btn btn-md btn-outline">Discover Events</Link>
              </div>
            ) : saved.map((ev, i) => (
              <motion.div key={ev.id} {...fadeUp(i * 0.06)}>
                <Link href={`/events/${ev.id}`}
                  className="card rounded-xl overflow-hidden flex gap-3 p-3 hover:border-[var(--border-hover)] transition-all group">
                  <img src={ev.image} alt={ev.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  <div className="shrink-0 hidden sm:block">
                    <EventDateBadge date={ev.date} size="sm" />
                  </div>
                  <div className="min-w-0 py-0.5">
                    <p className="text-base font-black text-[var(--text)] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">{ev.title}</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">{ev.venue}</p>
                    <p className="text-sm font-black grad-text mt-2">{ev.priceLabel}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Badges tab */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(profile.badges || []).map((b: any, i: number) => (
              <motion.div key={b.id} {...fadeUp(i * 0.06)}
                className={`card rounded-2xl p-5 text-center transition-all ${b.earned ? 'border-purple-200 dark:border-purple-800/50' : 'border-[var(--border)] opacity-50'}`}>
                <div className={`text-3xl mb-3 ${!b.earned ? 'grayscale opacity-40' : ''}`}>{b.icon}</div>
                <p className="text-sm font-semibold text-[var(--text)] mb-1">{b.name}</p>
                <p className="type-caption text-[var(--text-muted)]">{b.description}</p>
                {b.earned && b.earnedAt && (
                  <p className="type-caption mt-2 grad-text font-semibold">Earned {new Date(b.earnedAt).toLocaleDateString()}</p>
                )}
                {!b.earned && <p className="type-caption mt-2 text-[var(--text-muted)]">Not yet earned</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
