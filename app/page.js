import Link from 'next/link';

const APP = 'https://app.otsdesk.com';

export default function Marketing() {
  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,Segoe UI,sans-serif', color: '#0D1B2A', background: '#fff' }}>
      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.brand}><span style={S.mark}><Logo /></span>OTS <b style={{ color: '#2563EB' }}>Desk</b></div>
        <div style={S.navLinks}>
          <a href="#features" style={S.navLink}>Features</a>
          <a href="#pricing" style={S.navLink}>Pricing</a>
          <a href="#faq" style={S.navLink}>FAQ</a>
          <Link href="/login" style={S.navLink}>Sign in</Link>
          <Link href="/login" style={S.navCta}>Start free trial</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={S.hero}>
        <div style={S.badge}>Built for Walmart · TikTok Shop · Amazon · eBay sellers</div>
        <h1 style={S.h1}>Track every order.<br /><span style={{ color: '#2563EB' }}>Know every dollar of profit.</span></h1>
        <p style={S.heroSub}>OTS Desk is the all-in-one order management and profit tracking system for marketplace sellers. Import your orders, and see real net profit, margins, fees and inventory — automatically.</p>
        <div style={S.heroCtas}>
          <Link href="/login" style={S.ctaPrimary}>Start 1-month free trial</Link>
          <a href="#features" style={S.ctaGhost}>See features</a>
        </div>
        <p style={S.heroNote}>No credit card for trial · then $9.99/month · cancel anytime</p>
      </section>

      {/* FEATURES */}
      <section id="features" style={S.section}>
        <h2 style={S.h2}>Everything you need to run profitably</h2>
        <div style={S.featGrid}>
          {[
            ['Auto profit & margins', 'Every order shows real net profit and margin — item cost, fees, prep, shipping and refunds all factored in automatically.'],
            ['Live dashboard', 'Revenue, net profit, refunds and fees at a glance. Filter by day, week, month, quarter or year.'],
            ['Import marketplace sheets', 'Upload your Walmart, TikTok or Amazon order exports. We match, merge and never overwrite your data.'],
            ['Custom exports', 'Export exactly the columns you need — full, financial, customer, or order details — to Excel in one click.'],
            ['Inventory tracking', 'Add stock once. Sold units are deducted automatically from your orders, with low-stock alerts.'],
            ['Monthly cycles', 'Orders organized by billing cycle with reminders before renewal. Always know where you stand.'],
          ].map(([t, d]) => (
            <div key={t} style={S.feat}>
              <div style={S.featIcon}>✓</div>
              <h3 style={S.featTitle}>{t}</h3>
              <p style={S.featDesc}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ ...S.section, background: '#F8FAFC' }}>
        <h2 style={S.h2}>Simple, honest pricing</h2>
        <div style={S.priceCard}>
          <div style={S.priceBadge}>Everything included</div>
          <div style={S.price}>$9.99<span style={{ fontSize: 16, color: '#64748B', fontWeight: 500 }}>/month</span></div>
          <p style={{ color: '#64748B', fontSize: 14, margin: '4px 0 20px' }}>1-month free trial · cancel anytime</p>
          <ul style={S.priceList}>
            {['Unlimited dashboard & reports','Up to 250 orders / cycle','Import & export','Inventory tracking','Profit & margin automation','Email support'].map(x => (
              <li key={x} style={S.priceItem}><span style={{ color: '#10B981' }}>✓</span> {x}</li>
            ))}
          </ul>
          <Link href="/login" style={{ ...S.ctaPrimary, display: 'block', textAlign: 'center' }}>Start free trial</Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={S.section}>
        <h2 style={S.h2}>Frequently asked questions</h2>
        <div style={S.faqWrap}>
          {[
            ['Which marketplaces does it support?', 'OTS Desk works with Walmart, TikTok Shop, Amazon, eBay, Etsy and Shopify. Import your order sheets from any of them.'],
            ['Do I need a credit card for the trial?', 'No. Start your 1-month free trial and only pay $9.99/month if you continue.'],
            ['How is profit calculated?', 'Net profit = selling price − (item cost + prep + label + platform fee). Refunds and cancellations are handled automatically.'],
            ['Can I export my data?', 'Yes — export to Excel anytime, with the exact columns you choose.'],
            ['Is my data secure?', 'Your data is encrypted, and each account only ever sees its own orders. Passwords are hashed and never stored in plain text.'],
          ].map(([q, a]) => (
            <details key={q} style={S.faq}>
              <summary style={S.faqQ}>{q}</summary>
              <p style={S.faqA}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={S.finalCta}>
        <h2 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 10px' }}>Ready to see your real profit?</h2>
        <p style={{ color: '#B6C6DB', margin: '0 0 22px' }}>Start your free trial today. Set up in minutes.</p>
        <Link href="/login" style={S.ctaWhite}>Start free trial</Link>
      </section>

      {/* FOOTER */}
      <footer style={S.footer}>
        <div style={S.brand}><span style={S.markSm}><Logo /></span>OTS <b style={{ color: '#60A5FA' }}>Desk</b></div>
        <p style={{ color: '#64748B', fontSize: 12.5, margin: '10px 0 0' }}>Track. Manage. Profit. · © 2026 OTS Desk · HZ Creations Ltd</p>
      </footer>
    </div>
  );
}
function Logo() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>; }

const S = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 6vw', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: 0, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)', zIndex: 30 },
  brand: { display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 18 },
  mark: { width: 34, height: 34, borderRadius: 9, background: '#2563EB', display: 'grid', placeItems: 'center' },
  markSm: { width: 30, height: 30, borderRadius: 8, background: '#2563EB', display: 'grid', placeItems: 'center' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 22 },
  navLink: { color: '#475569', textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  navCta: { background: '#2563EB', color: '#fff', padding: '9px 18px', borderRadius: 9, textDecoration: 'none', fontSize: 14, fontWeight: 600 },
  hero: { textAlign: 'center', padding: '80px 6vw 70px', maxWidth: 820, margin: '0 auto' },
  badge: { display: 'inline-block', background: '#EFF6FF', color: '#2563EB', padding: '6px 14px', borderRadius: 30, fontSize: 12.5, fontWeight: 600, marginBottom: 22 },
  h1: { fontSize: 46, lineHeight: 1.12, fontWeight: 800, margin: '0 0 20px' },
  heroSub: { color: '#475569', fontSize: 17, lineHeight: 1.7, maxWidth: 640, margin: '0 auto 28px' },
  heroCtas: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  ctaPrimary: { background: '#2563EB', color: '#fff', padding: '14px 28px', borderRadius: 11, textDecoration: 'none', fontSize: 15, fontWeight: 600 },
  ctaGhost: { background: '#fff', color: '#0D1B2A', padding: '14px 28px', borderRadius: 11, textDecoration: 'none', fontSize: 15, fontWeight: 600, border: '1px solid #E2E8F0' },
  heroNote: { color: '#94A3B8', fontSize: 13, marginTop: 18 },
  section: { padding: '70px 6vw', maxWidth: 1080, margin: '0 auto' },
  h2: { fontSize: 30, fontWeight: 700, textAlign: 'center', margin: '0 0 40px' },
  featGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 },
  feat: { border: '1px solid #E2E8F0', borderRadius: 14, padding: 24 },
  featIcon: { width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, marginBottom: 14 },
  featTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 8px' },
  featDesc: { color: '#64748B', fontSize: 14, lineHeight: 1.65, margin: 0 },
  priceCard: { maxWidth: 420, margin: '0 auto', background: '#fff', border: '2px solid #2563EB', borderRadius: 18, padding: 32, textAlign: 'center', position: 'relative' },
  priceBadge: { position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  price: { fontSize: 46, fontWeight: 800, marginTop: 10 },
  priceList: { listStyle: 'none', padding: 0, margin: '0 0 22px', textAlign: 'left', display: 'grid', gap: 10 },
  priceItem: { display: 'flex', gap: 10, fontSize: 14, color: '#334155' },
  faqWrap: { maxWidth: 720, margin: '0 auto', display: 'grid', gap: 10 },
  faq: { border: '1px solid #E2E8F0', borderRadius: 12, padding: '4px 18px' },
  faqQ: { fontWeight: 600, fontSize: 15, padding: '14px 0', cursor: 'pointer' },
  faqA: { color: '#64748B', fontSize: 14, lineHeight: 1.65, margin: '0 0 14px' },
  finalCta: { background: 'linear-gradient(160deg,#0D1B2A,#1E3A8A)', color: '#fff', textAlign: 'center', padding: '70px 6vw', margin: '40px 0 0' },
  ctaWhite: { background: '#fff', color: '#0D1B2A', padding: '14px 30px', borderRadius: 11, textDecoration: 'none', fontSize: 15, fontWeight: 700 },
  footer: { textAlign: 'center', padding: '40px 6vw' },
};
