'use client';
import { useState, useEffect } from 'react';
import { api } from '../../lib/client';

export default function SettingsPage() {
  const [s, setS] = useState(null);
  const [billing, setBilling] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try {
      const [st, bl] = await Promise.all([api('/settings'), api('/settings/billing')]);
      setS(st); setBilling(bl);
    } catch (e) { setErr(e.message); }
  }
  async function save() {
    try {
      await api('/settings', { method: 'PATCH', body: JSON.stringify({
        defaultPrep: Number(s.defaultPrep) || 0,
        defaultLabel: Number(s.defaultLabel) || 0,
        platformFees: s.platformFees || [],
      })});
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert(e.message); }
  }
  function updateFee(i, field, val) {
    const fees = [...(s.platformFees || [])];
    fees[i] = { ...fees[i], [field]: field === 'pct' ? Number(val) : val };
    setS({ ...s, platformFees: fees });
  }
  function addFee() { setS({ ...s, platformFees: [...(s.platformFees||[]), { platform:'', category:null, pct:15 }] }); }
  function removeFee(i) { const fees=[...s.platformFees]; fees.splice(i,1); setS({...s, platformFees:fees}); }

  if (err) return <div style={S.err}>{err}</div>;
  if (!s) return <div style={S.loading}>Loading…</div>;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={S.h1}>Settings</h1>
      <p style={S.sub}>Defaults and billing for your account.</p>

      <div style={S.panel}>
        <h3 style={S.panelTitle}>Cost defaults</h3>
        <p style={S.hint}>Applied to new orders when you leave these blank.</p>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <div><label style={S.label}>Default prep cost</label><input type="number" step="0.01" style={S.input} value={s.defaultPrep ?? ''} onChange={e => setS({ ...s, defaultPrep: e.target.value })} /></div>
          <div><label style={S.label}>Default label cost</label><input type="number" step="0.01" style={S.input} value={s.defaultLabel ?? ''} onChange={e => setS({ ...s, defaultLabel: e.target.value })} /></div>
        </div>
      </div>

      <div style={S.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={S.panelTitle}>Platform fees</h3>
          <button onClick={addFee} style={S.btnGhost}>+ Add</button>
        </div>
        <p style={S.hint}>Auto-applied by platform when the fee is left blank on an order.</p>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {(s.platformFees || []).length === 0 && <span style={{ color: '#94A3B8', fontSize: 13 }}>No platform fees set.</span>}
          {(s.platformFees || []).map((fee, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input placeholder="Platform (Walmart…)" style={{ ...S.input, flex: 1 }} value={fee.platform || ''} onChange={e => updateFee(i,'platform',e.target.value)} />
              <input type="number" step="0.1" placeholder="%" style={{ ...S.input, width: 90 }} value={fee.pct ?? ''} onChange={e => updateFee(i,'pct',e.target.value)} />
              <span style={{ color: '#64748B', fontSize: 13 }}>%</span>
              <button onClick={() => removeFee(i)} style={S.delBtn}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={save} style={S.btnPrimary}>{saved ? '✓ Saved' : 'Save settings'}</button>

      {billing && (
        <div style={{ ...S.panel, marginTop: 24 }}>
          <h3 style={S.panelTitle}>Billing</h3>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {[
              ['Plan', billing.plan], ['Status', billing.state],
              ['Registered', billing.registeredAt], ['Current cycle', `${billing.cycleStart} → ${billing.cycleEnd}`],
              ['Next charge', `${billing.nextCharge} · $${billing.amount}`],
              billing.trialEndsAt ? ['Trial ends', billing.trialEndsAt] : null,
            ].filter(Boolean).map(([k,v]) => (
              <div key={k} style={S.billRow}><span style={{ color: '#64748B', fontSize: 13 }}>{k}</span><span style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{v}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const S = {
  h1: { fontSize: 22, fontWeight: 700, color: '#0D1B2A', margin: 0 }, sub: { color: '#64748B', fontSize: 13, margin: '4px 0 20px' },
  panel: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, marginBottom: 16 },
  panelTitle: { fontSize: 14, fontWeight: 700, color: '#0D1B2A', margin: 0 },
  hint: { color: '#94A3B8', fontSize: 12, margin: '4px 0 0' },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 },
  input: { padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' },
  btnPrimary: { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnGhost: { background: '#fff', color: '#475569', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: 8, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' },
  delBtn: { background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 14 },
  billRow: { display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #F1F5F9' },
  loading: { padding: 40, textAlign: 'center', color: '#94A3B8' },
  err: { background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 10, fontSize: 13 },
};
