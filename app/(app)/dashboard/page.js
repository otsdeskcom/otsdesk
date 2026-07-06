'use client';
import { useState, useEffect } from 'react';
import { api, money, pct } from '../../lib/client';

const RANGES = [
  { k: 'day', label: 'Today' }, { k: 'week', label: '7 days' },
  { k: 'month', label: '30 days' }, { k: 'quarter', label: 'Quarter' },
  { k: 'year', label: 'Year' },
];

export default function Dashboard() {
  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => { load(range); }, [range]);
  async function load(r) {
    setLoading(true); setErr('');
    try { const d = await api(`/dashboard?range=${r}`); setData(d); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }

  const k = data?.kpis || {};
  const cards = [
    { label: 'Revenue', value: money(k.revenue), accent: '#2563EB' },
    { label: 'Net Profit', value: money(k.netProfit), accent: k.netProfit >= 0 ? '#10B981' : '#EF4444' },
    { label: 'Margin', value: pct(k.margin), accent: '#8B5CF6' },
    { label: 'Total Orders', value: k.totalOrders ?? 0, accent: '#0EA5E9' },
  ];
  const sub = [
    { label: 'Buying cost', value: money(k.buyingCost) },
    { label: 'Platform fees', value: money(k.platformFees) },
    { label: 'Shipping/labels', value: money(k.shipping) },
    { label: 'Prep', value: money(k.prep) },
    { label: 'Refunds', value: money(k.refunds) },
    { label: 'Cancelled', value: k.cancelled ?? 0 },
  ];

  return (
    <div>
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>Dashboard</h1>
          <p style={S.sub}>Your sales, costs and profit at a glance.</p>
        </div>
        <div style={S.ranges}>
          {RANGES.map(r => (
            <button key={r.k} onClick={() => setRange(r.k)}
              style={{ ...S.rangeBtn, ...(range === r.k ? S.rangeActive : {}) }}>{r.label}</button>
          ))}
        </div>
      </div>

      {err && <div style={S.err}>{err}</div>}
      {loading ? <div style={S.loading}>Loading…</div> : (
        <>
          <div style={S.kpiGrid}>
            {cards.map(c => (
              <div key={c.label} style={S.kpi}>
                <div style={S.kpiLabel}>{c.label}</div>
                <div style={{ ...S.kpiValue, color: c.accent }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div style={S.twoCol}>
            <div style={S.panel}>
              <h3 style={S.panelTitle}>Revenue vs Net Profit</h3>
              <TrendChart trend={data?.charts?.trend || []} />
            </div>
            <div style={S.panel}>
              <h3 style={S.panelTitle}>Cost breakdown</h3>
              <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                {sub.map(s => (
                  <div key={s.label} style={S.subRow}>
                    <span style={{ color: '#64748B', fontSize: 13 }}>{s.label}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={S.panel}>
            <h3 style={S.panelTitle}>Orders by status</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              {(data?.charts?.byStatus || []).length === 0 && <span style={{ color: '#94A3B8', fontSize: 13 }}>No orders yet — add your first order to see insights.</span>}
              {(data?.charts?.byStatus || []).map(s => (
                <div key={s.status} style={S.statusPill}>
                  <b>{s.count}</b> {String(s.status).replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TrendChart({ trend }) {
  if (!trend.length) return <div style={{ color: '#94A3B8', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>No data for this range yet.</div>;
  const max = Math.max(...trend.map(t => Math.max(t.revenue, t.profit)), 1);
  const W = 560, H = 180, pad = 24;
  const x = i => pad + (i * (W - pad * 2)) / Math.max(trend.length - 1, 1);
  const y = v => H - pad - (v / max) * (H - pad * 2);
  const line = (key) => trend.map((t, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(t[key])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', marginTop: 8 }}>
      <path d={line('revenue')} fill="none" stroke="#2563EB" strokeWidth="2.5" />
      <path d={line('profit')} fill="none" stroke="#10B981" strokeWidth="2.5" />
      <g fontSize="10" fill="#94A3B8">
        <text x={pad} y={H - 4}>{trend[0]?.date?.slice(5)}</text>
        <text x={W - pad} y={H - 4} textAnchor="end">{trend[trend.length-1]?.date?.slice(5)}</text>
      </g>
    </svg>
  );
}

const S = {
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  h1: { fontSize: 22, fontWeight: 700, color: '#0D1B2A', margin: 0 },
  sub: { color: '#64748B', fontSize: 13, margin: '4px 0 0' },
  ranges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  rangeBtn: { padding: '7px 13px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' },
  rangeActive: { background: '#2563EB', color: '#fff', borderColor: '#2563EB' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 },
  kpi: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 },
  kpiLabel: { color: '#64748B', fontSize: 12.5, fontWeight: 600, marginBottom: 6 },
  kpiValue: { fontSize: 26, fontWeight: 700 },
  twoCol: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 16 },
  panel: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, marginBottom: 16 },
  panelTitle: { fontSize: 14, fontWeight: 700, color: '#0D1B2A', margin: 0 },
  subRow: { display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' },
  statusPill: { background: '#F1F5F9', borderRadius: 8, padding: '8px 12px', fontSize: 12.5, color: '#475569', textTransform: 'capitalize' },
  loading: { padding: 40, textAlign: 'center', color: '#94A3B8' },
  err: { background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 16 },
};
