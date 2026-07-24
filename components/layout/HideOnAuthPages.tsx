'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const AUTH_PAGES = ['/login', '/signup', '/auth/login', '/auth/signup'];

export default function HideOnAuthPages({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAuthPage = AUTH_PAGES.some(p => pathname === p || pathname.startsWith(p));

  if (isAuthPage) return null;

  return <>{children}</>;
}