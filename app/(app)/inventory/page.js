'use client';
import { useState, useEffect } from 'react';
import { api, money } from '../../lib/client';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true); setErr('');
    try { const d = await api('/inventory'); setItems(d.inventory || []); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }
  async function add(body) {
    try { const r = await api('/inventory', { method: 'POST', body: JSON.stringify(body) }); if (r?.ok) { setShowAdd(false); load(); } }
    catch (e) { alert(e.message); }
  }
  async function del(id) {
    if (!confirm('Delete this SKU?')) return;
    try { await api(`/inventory/${id}`, { method: 'DELETE' }); load(); } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={S.head}>
        <div><h1 style={S.h1}>Inventory</h1><p style={S.sub}>Stock is deducted automatically from your orders.</p></div>
        <button onClick={() => setShowAdd(true)} style={S.btnPrimary}>+ Add stock</button>
      </div>
      {err && <div style={S.err}>{err}</div>}
      <div style={S.tableWrap}>
        {loading ? <div style={S.loading}>Loading…</div> :
         items.length === 0 ? <div style={S.empty}><p style={{fontWeight:600}}>No inventory yet</p><p style={{color:'#64748B',fontSize:13}}>Add a SKU to start tracking stock.</p></div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr>{['SKU','Source','Added','Per item','Sold','Remaining','Stock value','',''].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} style={S.tr}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{it.sku}</td>
                    <td style={S.td}>{it.source || '—'}</td>
                    <td style={S.td}>{it.qty_added}</td>
                    <td style={S.td}>{money(it.perItem)}</td>
                    <td style={S.td}>{it.sold}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: it.lowStock ? '#EF4444' : '#0D1B2A' }}>{it.remaining}</td>
                    <td style={S.td}>{money(it.stockValue)}</td>
                    <td style={S.td}>{it.lowStock && <span style={S.low}>⚠ Low</span>}</td>
                    <td style={S.td}><button onClick={() => del(it.id)} style={S.delBtn}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showAdd && <AddStock onClose={() => setShowAdd(false)} onSave={add} />}
    </div>
  );
}
function AddStock({ onClose, onSave }) {
  const [f, setF] = useState({ sku: '', source: '', qty_added: '', purchase_cost: '', other_expense: '' });
  const set = (k,v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Add stock</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={S.label}>SKU *</label><input style={S.input} value={f.sku} onChange={e=>set('sku',e.target.value)} /></div>
          <div><label style={S.label}>Source</label><input style={S.input} value={f.source} onChange={e=>set('source',e.target.value)} placeholder="Sam's Club, Costco…" /></div>
          <div><label style={S.label}>Quantity added</label><input type="number" style={S.input} value={f.qty_added} onChange={e=>set('qty_added',e.target.value)} /></div>
          <div><label style={S.label}>Purchase cost (total)</label><input type="number" step="0.01" style={S.input} value={f.purchase_cost} onChange={e=>set('purchase_cost',e.target.value)} /></div>
          <div><label style={S.label}>Other expense</label><input type="number" step="0.01" style={S.input} value={f.other_expense} onChange={e=>set('other_expense',e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={() => onSave(f)} style={S.btnPrimary}>Save</button>
        </div>
      </div>
    </div>
  );
}
const S = {
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 700, color: '#0D1B2A', margin: 0 }, sub: { color: '#64748B', fontSize: 13, margin: '4px 0 0' },
  btnPrimary: { background: '#2563EB', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnGhost: { background: '#fff', color: '#475569', border: '1px solid #E2E8F0', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tableWrap: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '11px 12px', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' },
  tr: { borderBottom: '1px solid #F1F5F9' }, td: { padding: '10px 12px', color: '#334155', whiteSpace: 'nowrap' },
  low: { background: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  delBtn: { background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 14 },
  empty: { padding: 50, textAlign: 'center' }, loading: { padding: 40, textAlign: 'center', color: '#94A3B8' },
  err: { background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(13,27,42,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 },
  modal: { background: '#fff', borderRadius: 16, padding: 24, width: 420, maxWidth: '100%' },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' },
};
