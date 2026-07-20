'use client';

import { useEffect, useRef, useState } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
}

export default function CountdownTimer({ targetDate, label = 'Event starts in' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, past: false });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const compute = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, past: true });
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      const days    = Math.floor(diff / 86_400_000);
      const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft({ days, hours, minutes, seconds, past: false });
    };
    compute();
    intervalRef.current = setInterval(compute, 1_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [targetDate]);

  if (timeLeft.past) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="glass rounded-2xl p-5 border border-[var(--border)]">
      <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mb-3">{label}</p>
      <div className="flex items-end gap-3 sm:gap-5">
        {[
          { value: timeLeft.days,    label: 'days'    },
          { value: timeLeft.hours,   label: 'hours'   },
          { value: timeLeft.minutes, label: 'min'     },
          { value: timeLeft.seconds, label: 'sec'     },
        ].map(({ value, label: l }, i) => (
          <div key={l} className="flex items-end gap-3 sm:gap-5">
            <div className="text-center">
              <div
                className="text-4xl sm:text-5xl font-black tabular-nums leading-none"
                style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                {pad(value)}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">{l}</div>
            </div>
            {i < 3 && <div className="text-3xl font-black text-[var(--text-muted)] mb-2 leading-none">:</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
