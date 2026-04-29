'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Map, Ticket, User } from 'lucide-react';

const ITEMS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/events', label: 'Explore', Icon: Search },
  { href: '/tickets', label: 'Tickets', Icon: Ticket },
  { href: '/events#events-map', label: 'Map', Icon: Map },
  { href: '/profile', label: 'Profile', Icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed left-0 right-0 bottom-0 z-50">
      <div className="bg-[#11111a]/80 backdrop-blur-2xl border-t border-white/5 pb-safe">
        <div className="flex items-center justify-around px-2 py-3">
          {ITEMS.map(({ href, label, Icon }) => {
            const isActive =
              href === '/'
                ? pathname === '/'
                : pathname.startsWith(href.split('#')[0]);
                
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center w-[72px]"
              >
                <div className={`relative z-10 flex flex-col items-center gap-1.5 transition-colors duration-300 ${isActive ? 'text-[#3B9CFF]' : 'text-gray-400'}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-bold tracking-wide">{label}</span>
                </div>

                {isActive && (
                  <motion.div 
                    layoutId="mobile-active-bg"
                    className="absolute inset-0 top-[-6px] bottom-[-6px] bg-[#1a1a2e] rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                
                {isActive && (
                  <motion.div 
                    layoutId="mobile-active-dot"
                    className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-[#3B9CFF]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
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

