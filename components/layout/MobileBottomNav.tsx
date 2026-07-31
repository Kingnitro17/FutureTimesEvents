'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Map, Ticket, User } from 'lucide-react';

const ITEMS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/tickets', label: 'Tickets', Icon: Ticket },
  { href: '/map', label: 'Map', Icon: Map },
  { href: '/profile', label: 'Profile', Icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Hide bottom nav where it conflicts with ticket or scanner controls.
  const shouldHide = pathname?.startsWith('/events/')
    || pathname?.startsWith('/ticket/')
    || pathname?.startsWith('/checkin');

  if (shouldHide) return null;

  return (
    <div className="md:hidden fixed left-0 right-0 bottom-0 z-50">
      <div 
        className="bg-[var(--bg-card)]/95 backdrop-blur-xl border-t border-[var(--border)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <nav aria-label="Mobile navigation" className="flex items-stretch justify-around px-2 py-2">
          {ITEMS.map(({ href, label, Icon }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : Boolean(pathname?.startsWith(href.split('#')[0]));
                
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex min-h-14 min-w-16 flex-1 flex-col items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <motion.div
                  className={`relative flex flex-col items-center gap-2 transition-all duration-300 ${
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                  }`}
                  animate={{
                    scale: 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25
                  }}
                >
                  <motion.div
                    animate={{
                      y: 0
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }}
                  >
                    <Icon 
                      size={24} 
                      strokeWidth={isActive ? 2.5 : 2}
                      className=""
                    />
                  </motion.div>
                  <motion.span
                    className="text-[11px] font-semibold tracking-wide"
                    animate={{
                      opacity: isActive ? 1 : 0.7,
                      scale: isActive ? 1.05 : 1
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {label}
                  </motion.span>
                </motion.div>

                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 w-7 h-0.5 rounded-full bg-[var(--accent)]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

