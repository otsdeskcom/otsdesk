'use client';
import { useState, useEffect } from 'react';
import { api, money } from '../../lib/client';

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true); setErr('');
    try {
      const [o, u, a] = await Promise.all([api('/admin/overview'), api('/admin/users'), api('/admin/activity')]);
      setData(o); setUsers(u.users || []); setActivity(a.activity || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>;
  if (err) return <div style={S.err}>{err === 'Forbidden' ? 'This page is for the owner only.' : err}</div>;
  const k = data?.kpis || {};

  return (
    <div>
      <h1 style={S.h1}>Admin Console</h1>
      <p style={S.sub}>Owner-only overview of OTS Desk.</p>

      <div style={S.kpiGrid}>
        {[
          ['Total users', k.totalUsers, '#2563EB'], ['Active 24h', k.active24h, '#0EA5E9'],
          ['Trial', k.trialUsers, '#8B5CF6'], ['Paid', k.paidUsers, '#10B981'],
          ['MRR', money(k.mrr), '#10B981'], ['Revenue', money(k.revenue), '#0D1B2A'],
        ].map(([l, v, c]) => (
          <div key={l} style={S.kpi}><div style={S.kpiLabel}>{l}</div><div style={{ ...S.kpiValue, color: c }}>{v}</div></div>
        ))}
      </div>

      <div style={S.twoCol}>
        <div style={S.panel}>
          <h3 style={S.panelTitle}>Users ({users.length})</h3>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table style={S.table}>
              <thead><tr>{['Name','Platform','Status','Orders','Source'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={S.tr}>
                    <td style={S.td}><div style={{fontWeight:600}}>{u.name}</div><div style={{fontSize:11,color:'#94A3B8'}}>{u.email}</div></td>
                    <td style={S.td}>{u.platform || '—'}</td>
                    <td style={S.td}><span style={{ ...S.pill, ...(u.status==='active'?S.pillGreen:u.status==='past_due'?S.pillRed:S.pillGray) }}>{u.status}</span></td>
                    <td style={S.td}>{u.orders}</td>
                    <td style={S.td}>{u.heardFrom || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={S.panel}>
          <h3 style={S.panelTitle}>Sources</h3>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {(data?.sources || []).map(s => (
              <div key={s.source} style={S.srcRow}><span style={{fontSize:13}}>{s.source}</span><b style={{fontSize:13}}>{s.count}</b></div>
            ))}
          </div>
          <h3 style={{ ...S.panelTitle, marginTop: 20 }}>Recent activity</h3>
          <div style={{ display: 'grid', gap: 6, marginTop: 10, maxHeight: 260, overflowY: 'auto' }}>
            {activity.map((a, i) => (
              <div key={i} style={S.actRow}><span style={{fontSize:12.5}}><b>{a.user}</b> · {a.event}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
const S = {
  h1: { fontSize: 22, fontWeight: 700, color: '#0D1B2A', margin: 0 }, sub: { color: '#64748B', fontSize: 13, margin: '4px 0 20px' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 },
  kpi: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16 },
  kpiLabel: { color: '#64748B', fontSize: 12, fontWeight: 600, marginBottom: 6 }, kpiValue: { fontSize: 22, fontWeight: 700 },
  twoCol: { display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 },
  panel: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 },
  panelTitle: { fontSize: 14, fontWeight: 700, color: '#0D1B2A', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '8px 10px', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #F1F5F9' }, td: { padding: '9px 10px', color: '#334155', whiteSpace: 'nowrap' },
  pill: { padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' },
  pillGreen: { background: '#ECFDF5', color: '#059669' }, pillRed: { background: '#FEF2F2', color: '#DC2626' }, pillGray: { background: '#F1F5F9', color: '#64748B' },
  srcRow: { display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #F1F5F9' },
  actRow: { padding: '6px 0', borderBottom: '1px solid #F8FAFC', color: '#475569' },
  err: { background: '#FEF2F2', color: '#DC2626', padding: 16, borderRadius: 10, fontSize: 14 },
};
