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
    { label: 'Privacy Policy',  href: '#' },
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
              <span className="text-[var(--text)] tracking-tight">Events Distro</span>
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

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="type-caption text-[var(--text-muted)]">
            © {new Date().getFullYear()} Events Distro. All rights reserved.
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
