'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_EVENTS, MOCK_TICKETS } from '@/lib/mockData';
import { TrendingUp, Ticket, Users, DollarSign, Eye, Pencil, Copy, Download, Plus, QrCode } from 'lucide-react';
import EventDateBadge from '@/components/events/EventDateBadge';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview'|'events'|'attendees'|'create'>('overview');

  const totalRevenue   = MOCK_TICKETS.reduce((s, t) => s + t.totalAmount, 0);
  const checkedIn      = 847;
  const avgTicketValue = Math.round(totalRevenue / MOCK_TICKETS.length);

  const STATS = [
    { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, grad: 'linear-gradient(135deg,#FF55C2,#7222E3)', change: '+23%' },
    { label: 'Tickets Sold',  value: MOCK_TICKETS.length.toString(),      icon: Ticket,     grad: 'linear-gradient(135deg,#2CC4EA,#533885)', change: '+12%' },
    { label: 'Checked In',    value: checkedIn.toString(),                icon: Users,      grad: 'linear-gradient(135deg,#46FFAB,#A02EFF)', change: '71%' },
    { label: 'Avg Ticket',    value: `$${avgTicketValue}`,                icon: TrendingUp, grad: 'linear-gradient(135deg,#1D5BFF,#C7FE17)', change: '+5%' },
  ];

  const TABS = [
    { id: 'overview',  label: '📊 Overview'      },
    { id: 'events',    label: '🗓️ My Events'     },
    { id: 'attendees', label: '👥 Attendees'     },
    { id: 'create',    label: '✏️ Create Event'  },
  ] as const;

  return (
    <div className="min-h-screen page-offset pb-24" style={{ background: 'var(--bg-secondary)' }}>

      {/* Page header */}
      <div className="border-b border-[var(--border)] relative overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div className="absolute inset-0 opacity-40 dark:opacity-20 animate-stripe pointer-events-none" />
        <div className="container relative z-10 py-12 sm:py-16 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <motion.div {...fadeUp(0)}>
            <p className="section-label mb-2">Organizer</p>
            <h1 className="type-h1 text-[var(--text)] mb-2">Dashboard</h1>
            <p className="type-sm text-[var(--text-muted)]">Welcome back, Alex 👋 — here&apos;s what&apos;s happening today.</p>
          </motion.div>
          <div className="flex flex-wrap items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Link href="/checkin" className="btn btn-md btn-primary">
                <QrCode size={15} /> Check-in
              </Link>
            </motion.div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('create')}
              className="btn btn-md btn-grad">
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
              className="card rounded-2xl p-5 sm:p-6 card-hover"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-15 pointer-events-none" style={{ background: s.grad, filter: 'blur(16px)' }} />
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 relative z-10 shrink-0 shadow-md"
                style={{ background: s.grad }}>
                <s.icon size={18} />
              </div>
              <div className="type-h2 text-[var(--text)] mb-1 relative z-10">{s.value}</div>
              <div className="type-caption text-[var(--text-muted)] mb-2 relative z-10 font-medium">{s.label}</div>
              <div className="type-caption font-bold relative z-10" style={{ color: '#22c55e' }}>↑ {s.change}</div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">

          {/* Sidebar Tabs */}
          <motion.div {...fadeUp(0.1)} className="w-full lg:w-64 shrink-0">
            <div className="card rounded-2xl p-2 flex flex-row lg:flex-col overflow-x-auto scrollbar-hide lg:sticky lg:top-[calc(var(--nav-h)+24px)]">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 lg:flex-none text-left px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-[var(--bg-secondary)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text)]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tab Content */}
          <div className="flex-1 w-full min-w-0">
            <AnimatePresence mode="wait">
              
              {activeSection('overview') && (
                <motion.div key="overview" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-6">
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="type-h3 text-[var(--text)]">Recent Activity</h2>
                      <button className="text-sm font-semibold text-[var(--accent)] hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                            <Ticket size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--text)]">New Ticket Sale</p>
                            <p className="type-caption text-[var(--text-muted)]">2x VIP for Neon Dreams Festival</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-[var(--text)]">+$240</p>
                            <p className="type-caption text-[var(--text-muted)]">2m ago</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection('events') && (
                <motion.div key="events" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Active Events</h2>
                    <div className="space-y-4">
                      {MOCK_EVENTS.slice(0, 3).map((ev) => (
                        <div key={ev.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] transition-colors group">
                          <img src={ev.image} alt={ev.title} className="w-full sm:w-24 h-32 sm:h-24 rounded-lg object-cover shrink-0" />
                          <div className="shrink-0 hidden sm:block">
                            <EventDateBadge date={ev.date} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h3 className="text-base sm:text-lg font-black text-[var(--text)] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                              {ev.title}
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">
                              {ev.venue} · {ev.attendees} Attendees
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <button className="btn btn-sm btn-primary py-1.5 px-3 text-xs"><Eye size={12}/> View</button>
                              <button className="btn btn-sm btn-ghost py-1.5 px-3 text-xs"><Pencil size={12}/> Edit</button>
                              <button className="btn btn-sm btn-ghost py-1.5 px-3 text-xs"><Copy size={12}/> Clone</button>
                            </div>
                          </div>
                          <div className="sm:text-right shrink-0 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-[var(--border)] pt-3 sm:pt-0 sm:pl-4 mt-1 sm:mt-0">
                            <p className="type-caption text-[var(--text-muted)]">Revenue</p>
                            <p className="font-bold text-[var(--text)]">${(ev.attendees * ev.price).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSection('attendees') && (
                <motion.div key="attendees" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8 text-center py-20">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="type-h3 text-[var(--text)] mb-2">Attendee CRM</h3>
                    <p className="type-sm text-[var(--text-muted)] mb-6">Manage your audience, export lists, and send broadcasts.</p>
                    <button className="btn btn-md btn-outline"><Download size={16}/> Export CSV</button>
                  </div>
                </motion.div>
              )}

              {activeSection('create') && (
                <motion.div key="create" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="card rounded-2xl p-6 sm:p-8">
                    <h2 className="type-h3 text-[var(--text)] mb-6">Create New Event</h2>
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--text)]">Event Name</label>
                        <input type="text" placeholder="e.g. Neon Dreams Festival" className="input" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-[var(--text)]">Date</label>
                          <input type="date" className="input" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-[var(--text)]">Time</label>
                          <input type="time" className="input" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-[var(--text)]">Location</label>
                        <input type="text" placeholder="Venue or address" className="input" />
                      </div>
                      <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                        <button onClick={() => setActiveTab('overview')} className="btn btn-md btn-ghost">Cancel</button>
                        <button className="btn btn-md btn-grad">Continue to Details</button>
                      </div>
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

  // Helper for tab switching
  function activeSection(id: string) {
    return activeTab === id;
  }
}
