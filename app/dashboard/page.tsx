'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Ticket, Users, DollarSign, Eye,
  Pencil, Copy, Download, Plus, QrCode,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { useEvents } from '@/lib/useEvents';
import { useAnalytics } from '@/lib/useAnalytics';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

type TooltipEntry = { name: string; value: number; color?: string };
type TooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string };

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-[var(--border)] text-sm shadow-lg">
      <p className="font-semibold text-[var(--text)] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color ?? 'var(--accent)' }}>
          {p.name}: {p.name === 'revenue' ? '$' : ''}{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading, isOrganizer, isAdmin } = useAuth();
  const { events } = useEvents();
  const { analytics, loading: analyticsLoading } = useAnalytics(user?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'analytics' | 'create'>('overview');
  const router = useRouter();

  const [newEvent, setNewEvent] = useState({
    title: '', category: 'Music', date: '', time: '', venue: '', city: '', price: '', capacity: '', description: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsCreating(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `events/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('events').upload(path, imageFile, { upsert: true });
        if (uploadError) {
          // If the bucket doesn't exist or RLS blocks it, fallback gracefully
          console.error("Image upload failed:", uploadError);
          toast.error("Image upload failed. Is the 'events' storage bucket set to public?");
          setIsCreating(false);
          return;
        }
        imageUrl = supabase.storage.from('events').getPublicUrl(path).data.publicUrl;
      }

      const slug = newEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

      const { data, error } = await supabase.from('events').insert({
        title: newEvent.title,
        slug,
        category: newEvent.category.toLowerCase(),
        category_label: newEvent.category,
        date: newEvent.date,
        time: newEvent.time,
        venue: newEvent.venue,
        city: newEvent.city,
        description: newEvent.description,
        capacity: Number(newEvent.capacity) || 0,
        price: Number(newEvent.price) || 0,
        image_url: imageUrl,
        organizer_id: user.id,
        organizer_name: user.name,
        status: 'published'
      }).select().single();

      if (error) throw error;

      toast.success('Event created successfully!');
      setActiveTab('events');
      router.refresh();
      setNewEvent({ title: '', category: 'Music', date: '', time: '', venue: '', city: '', price: '', capacity: '', description: '' });
      setImageFile(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center pb-nav">
      <div className="text-center space-y-4 px-6">
        <p className="text-4xl">🔐</p>
        <h2 className="type-h2 text-[var(--text)]">Sign in to access Dashboard</h2>
        <Link href="/login" className="btn btn-lg btn-grad text-white">Sign In</Link>
      </div>
    </div>
  );

  if (!isOrganizer && !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center pb-nav">
      <div className="text-center space-y-4 px-6 max-w-sm">
        <p className="text-4xl">🚫</p>
        <h2 className="type-h2 text-[var(--text)]">Organizer Access Only</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Organizer access is assigned by an administrator after your event and identity are verified.
        </p>
        <div className="flex flex-col gap-3 mt-4">
          <Link href="/events" className="btn btn-lg btn-grad text-white w-full">Browse Events</Link>
          <Link href="/profile" className="btn btn-lg btn-outline w-full">View Profile</Link>
        </div>
      </div>
    </div>
  );

  const myEvents = events;
  const totalRevenue   = analytics?.totalRevenue   ?? (user.totalSpent ?? 0);
  const eventsCount    = analytics?.totalEvents    ?? myEvents.length;
  const totalAttendees = analytics?.totalAttendees ?? myEvents.reduce((s, e) => s + (e.attendees || 0), 0);
  const totalTickets   = analytics?.totalTickets   ?? 0;

  const STATS = [
    { label: 'Total Revenue',   value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, grad: 'linear-gradient(135deg,#FF55C2,#7222E3)' },
    { label: 'Active Events',   value: eventsCount.toString(),              icon: Ticket,     grad: 'linear-gradient(135deg,#2CC4EA,#533885)' },
    { label: 'Total Attendees', value: totalAttendees.toLocaleString(),     icon: Users,      grad: 'linear-gradient(135deg,#46FFAB,#A02EFF)' },
    { label: 'Tickets Sold',    value: totalTickets.toLocaleString(),       icon: TrendingUp, grad: 'linear-gradient(135deg,#1D5BFF,#C7FE17)' },
  ];

  const TABS = [
    { id: 'overview',  label: '📊 Overview'     },
    { id: 'events',    label: '🗓️ My Events'   },
    { id: 'analytics', label: '📈 Analytics'    },
    { id: 'create',    label: '✏️ Create Event' },
  ] as const;

  const firstName = user.name?.split(' ')[0] || 'there';

  // Recharts data
  const revenueData = (analytics?.revenueByDay ?? []).slice(-14); // last 14 days
  const tierData    = analytics?.tierBreakdown ?? [];

  return (
    <div className="min-h-screen page-offset pb-nav" style={{ background: 'var(--bg-secondary)' }}>

      {/* Page header */}
      <div className="border-b border-[var(--border)] relative overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="absolute inset-0 opacity-40 animate-stripe pointer-events-none" />
        <div className="container relative z-10 py-10 sm:py-14 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <motion.div {...fadeUp(0)}>
            <p className="section-label mb-2">Organizer</p>
            <h1 className="type-h1 text-[var(--text)] mb-2">Dashboard</h1>
            <div className="flex items-center gap-2">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                    {user.name?.slice(0, 2).toUpperCase() || 'FT'}
                  </div>
              }
              <p className="type-sm text-[var(--text-muted)]">
                Welcome back, <span className="font-semibold text-[var(--text)]">{firstName}</span> 👋
              </p>
            </div>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link href="/checkin" className="btn btn-md btn-primary"><QrCode size={15} /> Check-in</Link>
            </motion.div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('create')}
              className="btn btn-md btn-grad text-white">
              <Plus size={15} /> New Event
            </motion.button>
          </div>
        </div>
      </div>

      <div className="container py-8 sm:py-12">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {STATS.map((s, i) => (
            <motion.div key={s.label} {...fadeUp(i * 0.05)}
              className="card rounded-2xl p-5 sm:p-6 card-hover relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-15 pointer-events-none"
                style={{ background: s.grad, filter: 'blur(16px)' }} />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 relative z-10 shadow-md"
                style={{ background: s.grad }}>
                <s.icon size={18} />
              </div>
              {analyticsLoading
                ? <div className="skeleton h-7 w-20 rounded-lg mb-1" />
                : <div className="type-h2 text-[var(--text)] mb-1 relative z-10">{s.value}</div>
              }
              <div className="type-caption text-[var(--text-muted)] relative z-10 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">

          {/* Sidebar tabs */}
          <motion.div {...fadeUp(0.1)} className="w-full lg:w-64 shrink-0">
            <div className="card rounded-2xl p-2 flex flex-row lg:flex-col overflow-x-auto scrollbar-hide lg:sticky lg:top-[calc(var(--nav-h)+24px)]">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 lg:flex-none text-left px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[var(--bg-secondary)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text)]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tab content */}
          <div className="flex-1 w-full min-w-0">
            <AnimatePresence mode="wait">

              {/* Overview */}
              {activeTab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                  <div className="card rounded-2xl p-6">
                    <h2 className="type-h3 text-[var(--text)] mb-4">Account Summary</h2>
                    <div className="flex items-center gap-4">
                      {user.avatar
                        ? <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                        : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0"
                            style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                            {user.name?.slice(0, 2).toUpperCase() || 'FT'}
                          </div>
                      }
                      <div>
                        <p className="font-black text-[var(--text)] text-lg">{user.name}</p>
                        <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                        <span className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: 'var(--accent)', color: '#fff' }}>{user.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="type-h3 text-[var(--text)]">Live Events</h2>
                      <button onClick={() => setActiveTab('events')} className="text-sm font-semibold text-[var(--accent)] hover:underline">View All</button>
                    </div>
                    {myEvents.length === 0
                      ? <div className="text-center py-10 text-[var(--text-muted)]">
                          <p className="text-3xl mb-3">🗓️</p>
                          <p className="font-semibold mb-4">No events yet</p>
                          <button onClick={() => setActiveTab('create')} className="btn btn-sm btn-grad text-white"><Plus size={14} /> Create your first event</button>
                        </div>
                      : <div className="space-y-4">
                          {myEvents.slice(0, 3).map(ev => (
                            <div key={ev.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                              {ev.image
                                ? <img src={ev.image} alt={ev.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                : <div className="w-12 h-12 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-xl shrink-0">🎉</div>
                              }
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text)] line-clamp-1">{ev.title}</p>
                                <p className="type-caption text-[var(--text-muted)]">{ev.venue} · {ev.attendees || 0} attendees</p>
                              </div>
                              <p className="text-sm font-bold text-[var(--text)] shrink-0">{ev.priceLabel}</p>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                </motion.div>
              )}

              {/* My Events */}
              {activeTab === 'events' && (
                <motion.div key="events" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Active Events</h2>
                    {myEvents.length === 0
                      ? <div className="text-center py-12">
                          <p className="text-3xl mb-3">🗓️</p>
                          <p className="font-semibold text-[var(--text)] mb-2">No events found</p>
                          <p className="text-sm text-[var(--text-muted)] mb-6">Events you create will appear here.</p>
                          <button onClick={() => setActiveTab('create')} className="btn btn-md btn-grad text-white"><Plus size={14} /> Create Event</button>
                        </div>
                      : <div className="space-y-4">
                          {myEvents.map(ev => (
                            <div key={ev.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] transition-colors group">
                              {ev.image
                                ? <img src={ev.image} alt={ev.title} className="w-full sm:w-24 h-32 sm:h-24 rounded-lg object-cover shrink-0" />
                                : <div className="w-full sm:w-24 h-32 sm:h-24 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl shrink-0">🎉</div>
                              }
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <h3 className="text-base sm:text-lg font-black text-[var(--text)] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">{ev.title}</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">{ev.venue} · {ev.attendees || 0} Attendees</p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  <Link href={`/events/${ev.id}`} className="btn btn-sm btn-primary py-1.5 px-3 text-xs"><Eye size={12} /> View</Link>
                                  <button className="btn btn-sm btn-ghost py-1.5 px-3 text-xs"><Pencil size={12} /> Edit</button>
                                  <button className="btn btn-sm btn-ghost py-1.5 px-3 text-xs"><Copy size={12} /> Clone</button>
                                </div>
                              </div>
                              <div className="sm:text-right shrink-0 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-3 sm:pt-0 sm:pl-4 mt-1 sm:mt-0">
                                <p className="type-caption text-[var(--text-muted)]">Revenue</p>
                                <p className="font-bold text-[var(--text)]">${((ev.attendees || 0) * (ev.price || 0)).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                </motion.div>
              )}

              {/* Analytics */}
              {activeTab === 'analytics' && (
                <motion.div key="analytics" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">

                  {/* Revenue chart */}
                  <div className="card rounded-2xl p-6">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Revenue (Last 14 Days)</h2>
                    {analyticsLoading
                      ? <div className="skeleton h-[220px] rounded-xl" />
                      : <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={revenueData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="revenue" name="revenue" stroke="#FF55C2" strokeWidth={3} dot={{ fill: '#FF55C2', r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                    }
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Tickets bar */}
                    <div className="card rounded-2xl p-6">
                      <h2 className="type-h3 text-[var(--text)] mb-6">Tickets Sold</h2>
                      {analyticsLoading
                        ? <div className="skeleton h-[180px] rounded-xl" />
                        : <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={revenueData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <Tooltip content={<ChartTooltip />} />
                              <defs>
                                <linearGradient id="db-bar-grad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#FF55C2" />
                                  <stop offset="100%" stopColor="#7222E3" />
                                </linearGradient>
                              </defs>
                              <Bar dataKey="tickets" name="tickets" radius={[6, 6, 0, 0]} fill="url(#db-bar-grad)" />
                            </BarChart>
                          </ResponsiveContainer>
                      }
                    </div>

                    {/* Tier pie */}
                    <div className="card rounded-2xl p-6">
                      <h2 className="type-h3 text-[var(--text)] mb-6">Ticket Tiers</h2>
                      {analyticsLoading
                        ? <div className="skeleton h-[180px] rounded-xl" />
                        : tierData.length > 0
                          ? <ResponsiveContainer width="100%" height={180}>
                              <PieChart>
                                <Pie data={tierData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value">
                                  {tierData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                                <Legend iconType="circle" formatter={v => <span style={{ color: 'var(--text)', fontSize: 11 }}>{v}</span>} />
                              </PieChart>
                            </ResponsiveContainer>
                          : <div className="flex items-center justify-center h-[180px] text-[var(--text-muted)] text-sm">No tier data yet</div>
                      }
                    </div>
                  </div>

                  {/* Top events */}
                  {analytics?.topEvents && analytics.topEvents.length > 0 && (
                    <div className="card rounded-2xl p-6">
                      <h2 className="type-h3 text-[var(--text)] mb-4">Top Events by Revenue</h2>
                      <div className="space-y-3">
                        {analytics.topEvents.map((ev, i) => (
                          <div key={ev.id} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-secondary)]">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                              style={{ background: ['linear-gradient(135deg,#FFBC73,#FF00B9)', 'linear-gradient(135deg,#C0C0C0,#808080)', 'linear-gradient(135deg,#CD7F32,#8B4513)', 'var(--accent)', 'var(--accent-light)'][i] }}>
                              {i + 1}
                            </span>
                            <p className="flex-1 text-sm font-semibold text-[var(--text)] line-clamp-1">{ev.title}</p>
                            <p className="text-sm font-bold shrink-0" style={{ color: 'var(--accent)' }}>${ev.revenue.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button className="btn btn-md btn-outline"><Download size={15} /> Export CSV</button>
                  </div>
                </motion.div>
              )}

              {/* Create Event */}
              {activeTab === 'create' && (
                <motion.div key="create" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Create New Event</h2>
                    <form onSubmit={handleCreateEvent} className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-[var(--text)] mb-2">Event Image</label>
                        <label htmlFor="event-image" className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors bg-[var(--bg-secondary)]">
                          {imageFile ? (
                            <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-12 h-12 rounded-xl object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                              <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-[var(--text)]">{imageFile ? imageFile.name : 'Click to upload event photo'}</p>
                            <p className="text-xs text-[var(--text-muted)]">JPG, PNG up to 5MB</p>
                          </div>
                        </label>
                        <input type="file" accept="image/*" id="event-image" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-semibold text-[var(--text)] mb-2">Event Title</label>
                          <input type="text" placeholder="e.g., Summer Music Festival" className="w-full input" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[var(--text)] mb-2">Category</label>
                          <select className="w-full input" value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value})}>
                            <option>Music</option><option>Nightlife</option><option>Tech</option>
                            <option>Arts</option><option>Food</option><option>Sports</option>
                            <option>Business</option><option>Wellness</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div><label className="text-sm font-medium text-[var(--text)]">Date</label><input type="date" className="input mt-1.5 w-full" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required /></div>
                        <div><label className="text-sm font-medium text-[var(--text)]">Time</label><input type="time" className="input mt-1.5 w-full" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} required /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div><label className="text-sm font-medium text-[var(--text)]">Location / Venue</label><input type="text" placeholder="Venue or address" className="input mt-1.5 w-full" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} required /></div>
                        <div><label className="text-sm font-medium text-[var(--text)]">City</label><input type="text" placeholder="e.g., Harare" className="input mt-1.5 w-full" value={newEvent.city} onChange={e => setNewEvent({...newEvent, city: e.target.value})} required /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div><label className="text-sm font-medium text-[var(--text)]">Ticket Price ($)</label><input type="number" placeholder="0 for free" className="input mt-1.5 w-full" min="0" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} required /></div>
                        <div><label className="text-sm font-medium text-[var(--text)]">Capacity</label><input type="number" placeholder="Maximum attendees" className="input mt-1.5 w-full" min="1" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: e.target.value})} required /></div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--text)]">Description</label>
                        <textarea placeholder="Describe your event..." className="input mt-1.5 w-full min-h-[100px] py-3" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required />
                      </div>
                      <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                        <button type="button" onClick={() => setActiveTab('overview')} className="btn btn-md btn-ghost">Cancel</button>
                        <button type="submit" disabled={isCreating} className="btn btn-md btn-grad text-white disabled:opacity-50">
                          {isCreating ? 'Creating...' : 'Create Event'}
                        </button>
                      </div>
                    </form>
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
