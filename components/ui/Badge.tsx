import { ReactNode } from 'react';

const CATEGORY_STYLES: Record<string, string> = {
  music:    'bg-purple-100 text-purple-700',
  tech:     'bg-blue-100 text-blue-700',
  food:     'bg-orange-100 text-orange-700',
  art:      'bg-pink-100 text-pink-700',
  sports:   'bg-green-100 text-green-700',
  wellness: 'bg-teal-100 text-teal-700',
  family:   'bg-yellow-100 text-yellow-700',
};

interface BadgeProps {
  children: ReactNode;
  variant?: 'category' | 'featured' | 'status' | 'pill';
  category?: string;
  className?: string;
}

export default function Badge({ children, variant = 'pill', category, className = '' }: BadgeProps) {
  if (variant === 'category' && category) {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${CATEGORY_STYLES[category] || CATEGORY_STYLES.music} ${className}`}>
        {children}
      </span>
    );
  }
  if (variant === 'featured') {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest text-white uppercase ${className}`}
        style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
        {children}
      </span>
    );
  }
  if (variant === 'status') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] ${className}`}>
        {children}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-secondary)] text-[var(--text-muted)] ${className}`}>
      {children}
    </span>
  );
}
