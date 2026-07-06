'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, getToken } from '../lib/client';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { href: '/orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { href: '/admin', label: 'Admin', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function AppLayout({ children }) {
  const path = usePathname();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) { window.location.href = '/login'; return; }
    try {
      const raw = localStorage.getItem('ots_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  return (
    <div style={S.wrap}>
      <aside style={{ ...S.side, transform: open ? 'translateX(0)' : undefined }}>
        <div style={S.brand}>
          <span style={S.mark}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg></span>
          <span>OTS <b style={{ color: '#60A5FA' }}>Desk</b></span>
        </div>
        <nav style={S.nav}>
          {NAV.map(n => {
            const active = path === n.href;
            return (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                style={{ ...S.link, ...(active ? S.linkActive : {}) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={n.icon} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={S.bottom}>
          {user && <div style={S.user}><div style={S.avatar}>{(user.firstName||'U')[0]}</div><div><div style={{fontWeight:600,fontSize:13}}>{user.firstName} {user.lastName}</div><div style={{fontSize:11,color:'#94A3B8'}}>{user.email}</div></div></div>}
          <button onClick={logout} style={S.logout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Sign out
          </button>
        </div>
      </aside>
      <div style={S.main}>
        <header style={S.topbar}>
          <button onClick={() => setOpen(o => !o)} style={S.burger}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="#0D1B2A" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <span style={{ fontWeight: 700, color: '#0D1B2A' }}>{NAV.find(n => n.href === path)?.label || 'OTS Desk'}</span>
        </header>
        <main style={S.content}>{children}</main>
      </div>
    </div>
  );
}

const S = {
  wrap: { display: 'flex', minHeight: '100vh', background: '#F1F5F9' },
  side: { width: 240, background: '#0D1B2A', color: '#fff', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 40 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px', fontWeight: 800, fontSize: 18, borderBottom: '1px solid rgba(255,255,255,.08)' },
  mark: { width: 34, height: 34, borderRadius: 9, background: '#2563EB', display: 'grid', placeItems: 'center' },
  nav: { padding: 14, display: 'grid', gap: 4, flex: 1 },
  link: { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 9, color: '#CBD5E1', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  linkActive: { background: '#2563EB', color: '#fff' },
  bottom: { padding: 14, borderTop: '1px solid rgba(255,255,255,.08)' },
  user: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 },
  avatar: { width: 34, height: 34, borderRadius: '50%', background: '#2563EB', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14 },
  logout: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,.06)', color: '#CBD5E1', border: 'none', padding: '10px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  main: { flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column' },
  topbar: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', background: '#fff', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 20 },
  burger: { display: 'none', background: 'none', border: 'none', cursor: 'pointer' },
  content: { padding: 24, flex: 1 },
};
