'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useEvents } from '@/lib/useEvents';

const ADMIN_USERS = [
  { id: 'u1', name: 'Nigel Marara', email: 'nigelmarara0@gmail.com', role: 'admin', status: 'active', spent: 3200, color: '#FACC15' },
  { id: 'u2', name: 'Alex Johnson', email: 'alex@eventsdistro.com', role: 'organizer', status: 'active', spent: 1250, color: '#7B61FF' },
  { id: 'u3', name: 'Kim Lee', email: 'kim@email.com', role: 'user', status: 'active', spent: 890, color: '#F472B6' },
  { id: 'u4', name: 'Marcus Rivera', email: 'marcus@email.com', role: 'organizer', status: 'active', spent: 2400, color: '#4ADE80' },
  { id: 'u5', name: 'Taylor Swift', email: 'taylor@email.com', role: 'user', status: 'suspended', spent: 0, color: '#FB923C' },
  { id: 'u6', name: 'Dana Park', email: 'dana@email.com', role: 'user', status: 'active', spent: 560, color: '#60A5FA' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'revenue' | 'system'>('users');
  const [search, setSearch] = useState('');

  const filteredUsers = ADMIN_USERS.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = 180450;
  const totalUsers = 12847;
  const { events } = useEvents();
  const totalEvents = events.length;
  const activeEvents = 6;

  return (
    <div className="min-h-screen pt-[var(--nav-h)] pb-20 bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-3xl font-black text-[var(--text)]">Admin Panel</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#DD1FFF,#24D8FB)' }}>SUPER ADMIN</span>
            </div>
            <p className="text-[var(--text-muted)] text-sm">Platform management & oversight</p>
          </div>
          <div className="flex gap-2">
            <Link href="/analytics" className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text-muted)] hover:border-purple-400 transition-colors">📊 Analytics</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>🗓️ Dashboard</Link>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: '💰', grad: 'linear-gradient(135deg,#FF55C2,#7222E3)' },
            { label: 'Total Users', value: totalUsers.toLocaleString(), icon: '👥', grad: 'linear-gradient(135deg,#2CC4EA,#533885)' },
            { label: 'Total Events', value: totalEvents.toString(), icon: '🗓️', grad: 'linear-gradient(135deg,#46FFAB,#A02EFF)' },
            { label: 'Active Events', value: activeEvents.toString(), icon: '🔥', grad: 'linear-gradient(135deg,#FFBC73,#FF00B9)' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 sm:p-5 border border-[var(--border)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-6 -mt-6 opacity-10" style={{ background: s.grad }} />
              <div className="text-xl sm:text-2xl mb-1 sm:mb-2">{s.icon}</div>
              <div className="font-black text-xl sm:text-2xl text-[var(--text)]">{s.value}</div>
              <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {(['users', 'events', 'revenue', 'system'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border capitalize transition-all shrink-0 ${activeTab === tab ? 'text-white border-transparent' : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-card)]'}`}
              style={activeTab === tab ? { background: 'linear-gradient(135deg,#DD1FFF,#24D8FB)' } : {}}>
              {tab === 'users' ? '👥 Users' : tab === 'events' ? '🗓️ Events' : tab === 'revenue' ? '💰 Revenue' : '⚙️ System'}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="font-semibold text-[var(--text)]">User Management</h2>
              <div className="flex items-center gap-2 flex-1 max-w-xs px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] focus-within:border-purple-400 transition-all">
                <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                    {['User', 'Email', 'Role', 'Status', 'Spent', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0" style={{ background: u.color }}>
                            {u.name.split(' ').map(w => w[0]).join('')}
                          </div>
                          <span className="font-medium text-sm text-[var(--text)]">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'organizer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        ${u.spent.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button className="px-2 py-1 rounded-lg text-[10px] border border-[var(--border)] text-[var(--text-muted)] hover:border-blue-400 transition-all">Edit</button>
                          <button className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${u.status === 'active' ? 'border-red-200 text-red-400 hover:bg-red-50' : 'border-green-200 text-green-400 hover:bg-green-50'}`}>
                            {u.status === 'active' ? 'Ban' : 'Unban'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            {events.map(ev => (
              <div key={ev.id} className="glass rounded-xl p-4 border border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {ev.image ? (
                  <img src={ev.image} alt={ev.title} className="w-full sm:w-16 h-24 sm:h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-full sm:w-16 h-24 sm:h-12 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl shrink-0">🎉</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text)] line-clamp-1">{ev.title}</p>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1">{ev.date} · {ev.venue} · {ev.attendees} attendees</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">PUBLISHED</span>
                  <button className="px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] text-[var(--text-muted)] hover:border-yellow-400 transition-all">⭐ Feature</button>
                  <button className="px-3 py-1.5 rounded-lg text-xs border border-red-200 text-red-400 hover:bg-red-50 transition-all">🗑️ Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)] mb-4">Revenue Breakdown</h2>
              <div className="space-y-4">
                {[['Ticket Sales', '$142,000', '78%', 'linear-gradient(90deg,#FF55C2,#7222E3)'], ['Table Bookings', '$24,500', '14%', 'linear-gradient(90deg,#2CC4EA,#533885)'], ['Bottle Service', '$13,950', '8%', 'linear-gradient(90deg,#46FFAB,#A02EFF)']].map(([name, val, pct, grad]) => (
                  <div key={String(name)}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--text)]">{name}</span>
                      <span className="font-bold" style={{ background: String(grad), WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{val}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: String(pct), background: String(grad) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)] mb-4">Platform Fees</h2>
              <div className="space-y-3">
                {[['Service Fee (5%)', '$9,022'], ['Processing Fee (2.9%)', '$5,233'], ['Premium Features', '$2,400'], ['Total Platform Revenue', '$16,655']].map(([label, val], i) => (
                  <div key={String(label)} className={`flex justify-between text-sm py-2 ${i === 3 ? 'border-t border-[var(--border)] pt-3 font-bold' : ''}`}>
                    <span className="text-[var(--text-muted)]">{label}</span>
                    <span className={i === 3 ? 'text-[var(--text)]' : 'text-[var(--text)]'}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)] mb-4">System Health</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[['API Status', 'Operational', '✅', '#46FFAB'], ['Database', 'Healthy', '✅', '#2CC4EA'], ['CDN', 'Active', '✅', '#FF55C2']].map(([name, status, icon, color]) => (
                  <div key={String(name)} className="p-4 rounded-xl bg-[var(--bg-secondary)] flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <p className="font-medium text-sm text-[var(--text)]">{name}</p>
                      <p className="text-xs" style={{ color: String(color) }}>{status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass rounded-2xl p-6 border border-[var(--border)]">
              <h2 className="font-semibold text-[var(--text)] mb-4">Quick Actions</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[['Clear Cache', '🗑️', 'Purge CDN and application cache'], ['Send Broadcast', '📢', 'Send notification to all users'], ['Export Data', '📥', 'Download full platform report'], ['Maintenance Mode', '🔧', 'Toggle maintenance mode']].map(([label, icon, desc]) => (
                  <button key={String(label)} className="p-4 rounded-xl bg-[var(--bg-secondary)] text-left hover:bg-[var(--bg-card)] transition-colors group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{icon}</span>
                      <span className="font-medium text-sm text-[var(--text)] group-hover:text-purple-600 transition-colors">{label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
