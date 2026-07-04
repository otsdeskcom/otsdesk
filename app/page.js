import Link from 'next/link';

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#0D1B2A 0%,#13263B 55%,#1E3A8A 130%)',
      color: '#fff', textAlign: 'center', padding: 24,
    }}>
      <div>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#2563EB', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 8px' }}>OTS <span style={{ color: '#60A5FA' }}>Desk</span></h1>
        <p style={{ color: '#93C5FD', letterSpacing: 3, textTransform: 'uppercase', fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>Track · Manage · Profit</p>
        <p style={{ color: '#B6C6DB', fontSize: 15, maxWidth: 460, margin: '18px auto 0', lineHeight: 1.7 }}>
          The all-in-one order management and profit tracking system for marketplace sellers.
        </p>
        <div style={{ marginTop: 30, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/login" style={{ background: '#2563EB', color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>Sign in</Link>
          <Link href="/login" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 600, textDecoration: 'none', fontSize: 14, border: '1px solid rgba(255,255,255,.2)' }}>Start free trial</Link>
        </div>
      </div>
    </main>
  );
}
