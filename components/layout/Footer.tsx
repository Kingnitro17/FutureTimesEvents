import Link from 'next/link';

const FOOTER_LINKS = {
  Discover: [
    { label: 'Browse Events',   href: '/events' },
    { label: 'Map View',        href: '/events' },
    { label: 'Trending',        href: '/events' },
    { label: 'Categories',      href: '/events' },
  ],
  Community: [
    { label: 'For Organizers',  href: '/dashboard' },
    { label: 'Create Event',    href: '/dashboard' },
    { label: 'Partner Program', href: '#' },
    { label: 'Blog',            href: '#' },
  ],
  Company: [
    { label: 'About',           href: '#' },
    { label: 'Careers',         href: '#' },
    { label: 'Privacy Policy',  href: '/privacy-policy' },
    { label: 'Terms',           href: '#' },
  ],
};

function IconX() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
}
function IconInsta() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
}
function IconTiktok() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.67a8.18 8.18 0 0 0 4.8 1.54V6.74a4.86 4.86 0 0 1-1.03-.05z"/></svg>;
}
function IconYoutube() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23 7s-.27-1.9-1.1-2.73c-1.05-1.1-2.23-1.1-2.77-1.17C16.36 3 12 3 12 3s-4.36 0-7.13.1c-.54.07-1.72.07-2.77 1.17C1.27 5.1 1 7 1 7S.73 9.1.73 11.2v1.87c0 2.1.27 4.2.27 4.2s.27 1.9 1.1 2.73c1.05 1.1 2.43 1.07 3.04 1.18C7.2 21.27 12 21.27 12 21.27s4.36 0 7.13-.1c.54-.07 1.72-.07 2.77-1.17C22.73 19.17 23 17.27 23 17.27S23.27 15.17 23.27 13.07V11.2C23.27 9.1 23 7 23 7zm-13.84 8.53V8.47L16.6 12l-7.44 3.53z"/></svg>;
}

const SOCIALS = [
  { icon: IconX,       label: 'X / Twitter' },
  { icon: IconInsta,   label: 'Instagram'   },
  { icon: IconTiktok,  label: 'TikTok'      },
  { icon: IconYoutube, label: 'YouTube'     },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] pt-16 pb-8 relative overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(114,34,227,0.3), rgba(255,85,194,0.3), transparent)' }} />

      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-display font-black text-xl mb-4">
              <span className="text-2xl" style={{ background: 'linear-gradient(135deg,#FF55C2,#7222E3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>◈</span>
              <span className="text-[var(--text)] tracking-tight">Future Times Events</span>
            </Link>
            <p className="type-sm text-[var(--text-muted)] mb-6 max-w-xs leading-relaxed">
              Discover the world&apos;s most exciting events, curated for you. Built for explorers, dreamers &amp; night owls.
            </p>
            {/* Newsletter */}
            <div className="flex items-center gap-2 max-w-sm">
              <input type="email" placeholder="Enter your email" className="input flex-1 py-2 text-sm" />
              <button className="btn btn-sm btn-grad text-white">Subscribe</button>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="type-sm font-bold text-[var(--text)] mb-4 uppercase tracking-wider">{title}</h4>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l.label}>
                    <Link href={l.href} className="type-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider mb-8" />

        {/* App Download Section */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10">
          <span className="text-base font-semibold text-[var(--text-muted)]">Get the app:</span>
          <div className="flex flex-col sm:flex-row gap-5">
            {/* App Store Button */}
            <a 
              href="#" 
              className="flex items-center gap-4 px-8 py-6 rounded-2xl bg-gradient-to-br from-gray-900 to-black text-white hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 border border-white/10 min-w-fit whitespace-nowrap h-auto"
            >
              {/* Apple Logo */}
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.08-3.11-1.05.05-2.31.7-3.06 1.53-.67.74-1.26 1.93-1.1 3.04 1.18.09 2.37-.6 3.08-1.46"/>
              </svg>
              <div className="text-left">
                <div className="text-sm leading-none opacity-80 mb-1 font-medium">Download on the</div>
                <div className="text-2xl font-bold leading-tight tracking-tight">App Store</div>
              </div>
            </a>
            {/* Google Play Button */}
            <a 
              href="#" 
              className="flex items-center gap-4 px-8 py-7 rounded-2xl bg-gradient-to-br from-gray-900 to-black text-white hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300 border border-white/10 min-w-fit whitespace-nowrap h-auto pb-8"
            >
              {/* Google Play Logo */}
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none">
                <path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5ZM16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12ZM20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81ZM6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z" fill="url(#playGradient2)"/>
                <defs>
                  <linearGradient id="playGradient2" x1="3" y1="12" x2="20.75" y2="12" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#EA4335"/>
                    <stop offset="33%" stopColor="#FBBC04"/>
                    <stop offset="66%" stopColor="#34A853"/>
                    <stop offset="100%" stopColor="#4285F4"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-left">
                <div className="text-sm leading-none opacity-80 mb-1 font-medium">GET IT ON</div>
                <div className="text-2xl font-bold leading-normal tracking-tight">Google Play</div>
              </div>
            </a>
          </div>
        </div>

        <div className="divider mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="type-caption text-[var(--text-muted)]">
            © {new Date().getFullYear()} Future Times Events. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {SOCIALS.map(s => (
              <a key={s.label} href="#" aria-label={s.label}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--accent)] transition-all">
                <s.icon />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
