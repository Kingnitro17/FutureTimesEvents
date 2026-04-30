'use client';
import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ANALYTICS_DATA, HIGH_SPENDERS } from '@/lib/mockData';

const PIE_DATA = [{ name:'General', value:650 },{ name:'VIP', value:250 },{ name:'Early Bird', value:100 }];
const PIE_COLORS = ['#FF55C2','#7222E3','#2CC4EA'];

type TooltipEntry = { name: string; value: number; color?: string };
type CustomTooltipProps = { active?: boolean; payload?: TooltipEntry[]; label?: string };

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl p-3 border border-[var(--border)] text-sm">
      <p className="font-semibold text-[var(--text)] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.name==='revenue'?'$':''}{p.value.toLocaleString()}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'7d'|'30d'|'90d'|'1y'>('1y');
  const totalRevenue = ANALYTICS_DATA.reduce((s,d) => s+d.revenue, 0);
  const totalTickets = ANALYTICS_DATA.reduce((s,d) => s+d.tickets, 0);
  const avgAttendance = Math.round(ANALYTICS_DATA.reduce((s,d) => s+d.attendance, 0) / ANALYTICS_DATA.length);

  return (
    <div className="min-h-screen pt-[var(--nav-h)] pb-20 bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-3xl font-black text-[var(--text)] mb-1">Analytics Engine</h1>
            <p className="text-[var(--text-muted)] text-sm">Real-time performance insights for your events</p>
          </div>
          <div className="flex gap-2">
            {(['7d','30d','90d','1y'] as const).map(p => (
              <button key={p} onClick={()=>setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${period===p?'text-white border-transparent':'border-[var(--border)] text-[var(--text-muted)]'}`}
                style={period===p?{background:'linear-gradient(135deg,#FF55C2,#7222E3)'}:{}}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label:'Total Revenue', value:`$${totalRevenue.toLocaleString()}`, sub:'+23% vs last period', grad:'linear-gradient(135deg,#FF55C2,#7222E3)', icon:'💰' },
            { label:'Tickets Sold', value:totalTickets.toLocaleString(), sub:`${totalTickets} total transactions`, grad:'linear-gradient(135deg,#2CC4EA,#533885)', icon:'🎟️' },
            { label:'Avg Attendance', value:`${avgAttendance}%`, sub:'Per event capacity', grad:'linear-gradient(135deg,#46FFAB,#A02EFF)', icon:'👥' },
            { label:'Top Spender', value:'$2,400', sub:'Marcus R. — VIP Elite', grad:'linear-gradient(135deg,#FFBC73,#FF00B9)', icon:'👑' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-5 border border-[var(--border)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-10" style={{ background:s.grad }} />
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="font-black text-2xl text-[var(--text)] mb-0.5">{s.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{s.label}</div>
              <div className="text-[11px] font-medium mt-1" style={{ color:'#46FFAB' }}>↑ {s.sub}</div>
            </div>
          ))}
        </div>

        {/* Revenue Line Chart */}
        <div className="glass rounded-2xl p-6 border border-[var(--border)] mb-6">
          <h2 className="font-semibold text-[var(--text)] mb-6">Revenue Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={ANALYTICS_DATA} margin={{ top:5, right:10, bottom:5, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--text-muted)', fontSize:12 }} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="revenue" name="revenue" stroke="#FF55C2" strokeWidth={3} dot={{ fill:'#FF55C2', r:4 }} activeDot={{ r:6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Tickets Bar Chart */}
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text)] mb-6">Tickets Sold</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ANALYTICS_DATA} margin={{ top:5, right:10, bottom:5, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="tickets" name="tickets" radius={[6,6,0,0]}>
                  {ANALYTICS_DATA.map((_,i) => (
                    <Cell key={i} fill={`url(#grad${i%3})`} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="grad0" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF55C2" /><stop offset="100%" stopColor="#7222E3" /></linearGradient>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2CC4EA" /><stop offset="100%" stopColor="#533885" /></linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#46FFAB" /><stop offset="100%" stopColor="#A02EFF" /></linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="glass rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text)] mb-6">Ticket Tier Distribution</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {PIE_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" formatter={(v) => <span style={{ color:'var(--text)', fontSize:12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* High Spenders */}
        <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text)]">👑 High Spender Detection</h2>
            <span className="text-xs px-3 py-1 rounded-full font-medium text-white" style={{ background:'linear-gradient(135deg,#FFBC73,#FF00B9)' }}>AI Monitored</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                  {['Rank','Customer','Tickets','Total Spent','Badge','Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HIGH_SPENDERS.map((s,i) => (
                  <tr key={s.email} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="px-4 py-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                        style={{ background:['linear-gradient(135deg,#FFBC73,#FF00B9)','linear-gradient(135deg,#C0C0C0,#808080)','linear-gradient(135deg,#CD7F32,#8B4513)','#2CC4EA','#533885'][i], display:'inline-flex' }}>
                        {i+1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-[var(--text)]">{s.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{s.tickets}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ background:'linear-gradient(135deg,#FF55C2,#7222E3)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>${s.spent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{s.badge}</td>
                    <td className="px-4 py-3">
                      <button className="px-3 py-1 rounded-lg text-xs font-medium text-white hover:scale-105 transition-transform" style={{ background:'linear-gradient(135deg,#FF55C2,#7222E3)' }}>VIP Offer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
