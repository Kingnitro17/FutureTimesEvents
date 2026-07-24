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
      <div className="bg-[#11111a]/95 backdrop-blur-xl border-t border-white/5 pb-safe">
        <div className="flex items-center justify-around px-4 py-4">
          {ITEMS.map(({ href, label, Icon }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : Boolean(pathname?.startsWith(href.split('#')[0]));
                
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center w-16"
              >
                <motion.div
                  className={`relative flex flex-col items-center gap-2 transition-all duration-300 ${
                    isActive ? 'text-[#3B9CFF]' : 'text-gray-500'
                  }`}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25
                  }}
                >
                  <motion.div
                    animate={{
                      y: isActive ? -4 : 0
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
                      className={isActive ? 'drop-shadow-[0_0_8px_rgba(59,156,255,0.5)]' : ''}
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
                    className="absolute -bottom-2 w-8 h-1 rounded-full bg-[#3B9CFF]"
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
        </div>
      </div>
    </div>
  );
}

