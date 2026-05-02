'use client';
import { useState } from 'react';
import { MOCK_NOTIFICATIONS } from '@/lib/mockData';
import Link from 'next/link';

const TYPE_ICON: Record<string,string> = { ticket:'🎟️', reminder:'⏰', update:'📢', system:'⭐', promo:'🔥' };
const TYPE_COLOR: Record<string,string> = { ticket:'#FF55C2', reminder:'#2CC4EA', update:'#46FFAB', system:'#FFBC73', promo:'#DD1FFF' };

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const unread = notifs.filter(n => !n.read).length;

  const markAll = () => setNotifs(n => n.map(x => ({...x, read:true})));
  const markOne = (id:string) => setNotifs(n => n.map(x => x.id===id?{...x,read:true}:x));

  return (
    <div className="min-h-screen pt-[var(--nav-h)] pb-20 bg-[var(--bg-secondary)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-black text-[var(--text)] mb-1">Notifications</h1>
            {unread > 0 && <p className="text-sm text-[var(--text-muted)]">{unread} unread</p>}
          </div>
          {unread > 0 && (
            <button onClick={markAll} className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">Mark all read</button>
          )}
        </div>

        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n.id} onClick={() => markOne(n.id)}
              className={`glass rounded-2xl p-4 border transition-all cursor-pointer hover:border-purple-300 dark:hover:border-purple-700 ${!n.read?'border-purple-200 dark:border-purple-800/50':'border-[var(--border)]'}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background:`${TYPE_COLOR[n.type]}20`, border:`1px solid ${TYPE_COLOR[n.type]}40` }}>
                  {TYPE_ICON[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${!n.read?'text-[var(--text)]':'text-[var(--text-muted)]'}`}>{n.title}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!n.read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background:'#FF55C2' }} />}
                      <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">{n.time}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{n.message}</p>
                  {n.eventId && (
                    <Link href={`/events/${n.eventId}`} onClick={e=>e.stopPropagation()}
                      className="inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full text-white hover:scale-105 transition-transform"
                      style={{ background:'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                      View Event →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {notifs.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="font-display text-xl font-bold text-[var(--text)]">All caught up!</h3>
            <p className="text-[var(--text-muted)] text-sm mt-2">No new notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}
