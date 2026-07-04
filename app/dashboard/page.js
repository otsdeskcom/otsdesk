export const dynamic = 'force-dynamic';
export default function Dashboard() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F1F5F9', fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#2563EB', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></svg>
        </div>
        <h1 style={{ fontSize: 24, color: '#0D1B2A', margin: '0 0 8px' }}>Welcome to OTS Desk 🎉</h1>
        <p style={{ color: '#64748B', fontSize: 14, lineHeight: 1.7 }}>
          Your account is verified and you're signed in. The full dashboard — orders, profit tracking, inventory —
          is being built and will appear here shortly.
        </p>
        <a href="/login" style={{ display: 'inline-block', marginTop: 20, color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</a>
      </div>
    </main>
  );
}
