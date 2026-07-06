'use client';
import { useState, useEffect } from 'react';
import { api, money, pct } from '../../lib/client';

const STATUSES = ['to_ship','label_created','preparing','on_hold','in_transit','out_for_delivery','delivered','completed','cancelled','refunded'];
const CARRIERS = ['USPS','UPS','FedEx','DHL','Amazon','OnTrac','LaserShip','GLS','Other'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState({ used: 0, limit: 250, remaining: 250 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { loadAll(); }, [month, sort]);
  async function loadAll() {
    setLoading(true); setErr('');
    try {
      const [o, m, l] = await Promise.all([
        api(`/orders?month=${month}&sort=${sort}&search=${encodeURIComponent(search)}`),
        api('/orders/months'),
        api('/orders/limit'),
      ]);
      setOrders(o.orders || []); setMonths(m.months || []); setLimit(l);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }

  async function addOrder(body) {
    try {
      const r = await api('/orders', { method: 'POST', body: JSON.stringify(body) });
      if (r?.ok) { setShowAdd(false); loadAll(); }
    } catch (e) { alert(e.message); }
  }
  async function updateCell(id, field, value) {
    try { await api(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) }); loadAll(); }
    catch (e) { alert(e.message); }
  }
  async function delOrder(id) {
    if (!confirm('Delete this order?')) return;
    try { await api(`/orders/${id}`, { method: 'DELETE' }); loadAll(); } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>Orders</h1>
          <p style={S.sub}>{limit.used} / {limit.limit} orders this cycle · {limit.remaining} remaining</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadAll()} style={S.searchBox} />
          <button onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')} style={S.btnGhost}>
            {sort === 'newest' ? '↓ Newest' : '↑ Oldest'}
          </button>
          <button onClick={() => setShowAdd(true)} style={S.btnPrimary}>+ Add order</button>
        </div>
      </div>

      {/* month tabs */}
      <div style={S.tabs}>
        <button onClick={() => setMonth('all')} style={{ ...S.tab, ...(month === 'all' ? S.tabActive : {}) }}>All</button>
        {months.map(m => (
          <button key={m.cycle_month} onClick={() => setMonth(m.cycle_month)}
            style={{ ...S.tab, ...(month === m.cycle_month ? S.tabActive : {}) }}>
            {m.cycle_month} <span style={S.tabCount}>{m.count}</span>
          </button>
        ))}
      </div>

      {err && <div style={S.err}>{err}</div>}

      <div style={S.tableWrap}>
        {loading ? <div style={S.loading}>Loading…</div> :
         orders.length === 0 ? (
          <div style={S.empty}>
            <p style={{ fontWeight: 600, color: '#0D1B2A' }}>No orders yet</p>
            <p style={{ color: '#64748B', fontSize: 13 }}>Add your first order to start tracking profit.</p>
            <button onClick={() => setShowAdd(true)} style={{ ...S.btnPrimary, marginTop: 10 }}>+ Add order</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['S.No','Order ID','Date','Status','Supplier','SKU','Qty','Item Cost','Sell','Fees','Total Cost','Net Profit','Margin','Carrier','Tracking',''].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={S.tr}>
                    <td style={S.tdSerial}>{String(o.serial_no).padStart(2,'0')}</td>
                    <td style={S.td}>{o.platform_order_id || '—'}</td>
                    <td style={S.td}>{String(o.order_date).slice(0,10)}</td>
                    <td style={S.td}>
                      <select value={o.status} onChange={e => updateCell(o.id,'status',e.target.value)} style={S.cellSelect}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                      </select>
                    </td>
                    <td style={S.td}>{o.supplier || '—'}</td>
                    <td style={S.td}>{o.sku || '—'}</td>
                    <td style={S.td}>{o.qty}</td>
                    <td style={S.td}>{money(o.item_cost)}</td>
                    <td style={S.td}>{money(o.selling_price)}</td>
                    <td style={S.td}>{money(o.platform_fee)}</td>
                    <td style={S.td}>{money(o.total_cost)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: o.net_profit >= 0 ? '#10B981' : '#EF4444' }}>{money(o.net_profit)}</td>
                    <td style={{ ...S.td, color: o.margin >= 0 ? '#10B981' : '#EF4444' }}>{pct(o.margin)}</td>
                    <td style={S.td}>{o.carrier || '—'}</td>
                    <td style={S.td}>{o.tracking_number || '—'}</td>
                    <td style={S.td}><button onClick={() => delOrder(o.id)} style={S.delBtn}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} onSave={addOrder} />}
    </div>
  );
}

function AddOrderModal({ onClose, onSave }) {
  const [f, setF] = useState({
    platform_order_id: '', order_date: new Date().toISOString().slice(0,10),
    status: 'to_ship', supplier: '', sku: '', qty: 1, per_item_cost: '',
    selling_price: '', prep_cost: '', label_cost: '', platform_fee: '',
    carrier: '', tracking_number: '', customer_name: '',
  });
  const set = (k,v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Add order</h2>
        <p style={{ color: '#64748B', fontSize: 12.5, margin: '0 0 16px' }}>Profit is calculated automatically.</p>
        <div style={S.formGrid}>
          <F label="Order ID"><input style={S.input} value={f.platform_order_id} onChange={e=>set('platform_order_id',e.target.value)} /></F>
          <F label="Order date"><input type="date" style={S.input} value={f.order_date} onChange={e=>set('order_date',e.target.value)} /></F>
          <F label="Status"><select style={S.input} value={f.status} onChange={e=>set('status',e.target.value)}>{STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></F>
          <F label="Supplier"><input style={S.input} value={f.supplier} onChange={e=>set('supplier',e.target.value)} placeholder="Walmart, Costco…" /></F>
          <F label="SKU"><input style={S.input} value={f.sku} onChange={e=>set('sku',e.target.value)} /></F>
          <F label="Qty"><input type="number" style={S.input} value={f.qty} onChange={e=>set('qty',e.target.value)} /></F>
          <F label="Per item cost"><input type="number" step="0.01" style={S.input} value={f.per_item_cost} onChange={e=>set('per_item_cost',e.target.value)} /></F>
          <F label="Selling price"><input type="number" step="0.01" style={S.input} value={f.selling_price} onChange={e=>set('selling_price',e.target.value)} /></F>
          <F label="Platform fee"><input type="number" step="0.01" style={S.input} value={f.platform_fee} onChange={e=>set('platform_fee',e.target.value)} placeholder="auto if blank" /></F>
          <F label="Prep cost"><input type="number" step="0.01" style={S.input} value={f.prep_cost} onChange={e=>set('prep_cost',e.target.value)} /></F>
          <F label="Label cost"><input type="number" step="0.01" style={S.input} value={f.label_cost} onChange={e=>set('label_cost',e.target.value)} /></F>
          <F label="Carrier"><select style={S.input} value={f.carrier} onChange={e=>set('carrier',e.target.value)}><option value="">—</option>{CARRIERS.map(c=><option key={c}>{c}</option>)}</select></F>
          <F label="Tracking #"><input style={S.input} value={f.tracking_number} onChange={e=>set('tracking_number',e.target.value)} /></F>
          <F label="Customer"><input style={S.input} value={f.customer_name} onChange={e=>set('customer_name',e.target.value)} /></F>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={() => onSave(f)} style={S.btnPrimary}>Save order</button>
        </div>
      </div>
    </div>
  );
}
function F({ label, children }) { return <div><label style={S.label}>{label}</label>{children}</div>; }

const S = {
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  h1: { fontSize: 22, fontWeight: 700, color: '#0D1B2A', margin: 0 },
  sub: { color: '#64748B', fontSize: 13, margin: '4px 0 0' },
  searchBox: { padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' },
  btnPrimary: { background: '#2563EB', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnGhost: { background: '#fff', color: '#475569', border: '1px solid #E2E8F0', padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  tab: { padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { background: '#0D1B2A', color: '#fff', borderColor: '#0D1B2A' },
  tabCount: { background: 'rgba(0,0,0,.1)', borderRadius: 20, padding: '1px 7px', fontSize: 11 },
  tableWrap: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '11px 12px', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '10px 12px', color: '#334155', whiteSpace: 'nowrap' },
  tdSerial: { padding: '10px 12px', fontWeight: 700, color: '#0D1B2A', background: '#F8FAFC' },
  cellSelect: { border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 6px', fontSize: 12, textTransform: 'capitalize' },
  delBtn: { background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 14 },
  empty: { padding: 50, textAlign: 'center' },
  loading: { padding: 40, textAlign: 'center', color: '#94A3B8' },
  err: { background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(13,27,42,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 },
  modal: { background: '#fff', borderRadius: 16, padding: 24, width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' },
};
