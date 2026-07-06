'use client';
import { useState, useEffect, useRef } from 'react';
import { api, getToken, money, pct } from '../../lib/client';

const STATUSES = ['to_ship','label_created','preparing','on_hold','in_transit','out_for_delivery','delivered','completed','cancelled','refunded'];
const CARRIERS = ['USPS','UPS','FedEx','DHL','Amazon','OnTrac','LaserShip','GLS','Other'];

// editable columns config: key, label, type
const COLS = [
  { k: 'serial_no', label: 'S.No', ro: true },
  { k: 'platform_order_id', label: 'Order ID', type: 'text' },
  { k: 'order_date', label: 'Date', type: 'date' },
  { k: 'status', label: 'Status', type: 'status' },
  { k: 'supplier', label: 'Supplier', type: 'text' },
  { k: 'supplier_order_id', label: 'Supplier Order ID', type: 'text' },
  { k: 'sku', label: 'SKU', type: 'text' },
  { k: 'qty', label: 'Qty', type: 'number' },
  { k: 'per_item_cost', label: 'Per Item', type: 'money' },
  { k: 'item_cost', label: 'Item Cost', ro: true, calc: true },
  { k: 'selling_price', label: 'Sell', type: 'money' },
  { k: 'prep_cost', label: 'Prep', type: 'money' },
  { k: 'label_cost', label: 'Label', type: 'money' },
  { k: 'platform_fee', label: 'Fees', type: 'money' },
  { k: 'total_cost', label: 'Total Cost', ro: true, calc: true },
  { k: 'net_profit', label: 'Net Profit', ro: true, calc: true, profit: true },
  { k: 'margin', label: 'Margin', ro: true, calc: true, profit: true },
  { k: 'refund_amount', label: 'Refund', type: 'money' },
  { k: 'carrier', label: 'Carrier', type: 'carrier' },
  { k: 'tracking_number', label: 'Tracking', type: 'text' },
  { k: 'customer_name', label: 'Customer', type: 'text' },
  { k: 'city', label: 'City', type: 'text' },
  { k: 'state', label: 'State', type: 'text' },
  { k: 'note', label: 'Note', type: 'text' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState({ used: 0, limit: 250, remaining: 250 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [edit, setEdit] = useState(null); // {id, field}
  const [err, setErr] = useState('');
  const fileRef = useRef();

  useEffect(() => { loadAll(); }, [month, sort]);
  async function loadAll() {
    setLoading(true); setErr('');
    try {
      const [o, m, l] = await Promise.all([
        api(`/orders?month=${month}&sort=${sort}&search=${encodeURIComponent(search)}`),
        api('/orders/months'), api('/orders/limit'),
      ]);
      setOrders(o.orders || []); setMonths(m.months || []); setLimit(l);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }
  async function addOrder(body) {
    try { const r = await api('/orders', { method: 'POST', body: JSON.stringify(body) }); if (r?.ok) { setShowAdd(false); loadAll(); } }
    catch (e) { alert(e.message); }
  }
  async function saveCell(id, field, value) {
    setEdit(null);
    try { await api(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) }); loadAll(); }
    catch (e) { alert(e.message); }
  }
  async function delOrder(id) {
    if (!confirm('Delete this order?')) return;
    try { await api(`/orders/${id}`, { method: 'DELETE' }); loadAll(); } catch (e) { alert(e.message); }
  }
  async function doImport(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setImportMsg('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/import', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportMsg(`Imported: ${data.added} added, ${data.updated} updated, ${data.skipped} skipped`);
      loadAll();
    } catch (e) { setImportMsg('Error: ' + e.message); }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function cellVal(o, c) {
    let v = o[c.k];
    if (c.k === 'serial_no') return String(o.serial_no).padStart(2,'0');
    if (c.k === 'order_date') return String(v||'').slice(0,10);
    if (c.type === 'money' || c.calc && c.k !== 'margin') return money(v);
    if (c.k === 'margin') return pct(v);
    return v ?? '—';
  }

  return (
    <div>
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>Orders</h1>
          <p style={S.sub}>{limit.used} / {limit.limit} orders this cycle · {limit.remaining} remaining</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadAll()} style={S.searchBox} />
          <button onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')} style={S.btnGhost}>{sort === 'newest' ? '↓ Newest' : '↑ Oldest'}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={doImport} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} style={S.btnGhost} disabled={importing}>{importing ? 'Importing…' : '↑ Import'}</button>
          <button onClick={() => setShowExport(true)} style={S.btnGhost}>↓ Export</button>
          <button onClick={() => setShowAdd(true)} style={S.btnPrimary}>+ Add order</button>
        </div>
      </div>

      {importMsg && <div style={S.info}>{importMsg}</div>}

      <div style={S.tabs}>
        <button onClick={() => setMonth('all')} style={{ ...S.tab, ...(month === 'all' ? S.tabActive : {}) }}>All</button>
        {months.map(m => (
          <button key={m.cycle_month} onClick={() => setMonth(m.cycle_month)} style={{ ...S.tab, ...(month === m.cycle_month ? S.tabActive : {}) }}>
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
            <p style={{ color: '#64748B', fontSize: 13 }}>Add your first order or import a marketplace sheet.</p>
            <button onClick={() => setShowAdd(true)} style={{ ...S.btnPrimary, marginTop: 10 }}>+ Add order</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead><tr>{COLS.map(c => <th key={c.k} style={S.th}>{c.label}</th>)}<th style={S.th}></th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={S.tr}>
                    {COLS.map(c => {
                      const editing = edit?.id === o.id && edit?.field === c.k;
                      const profitColor = c.profit ? (o[c.k] >= 0 ? '#10B981' : '#EF4444') : '#334155';
                      if (c.ro) return <td key={c.k} style={{ ...(c.k==='serial_no'?S.tdSerial:S.td), color: profitColor, fontWeight: c.profit ? 700 : 400 }}>{cellVal(o, c)}</td>;
                      if (editing) return <td key={c.k} style={S.td}><EditCell c={c} value={o[c.k]} onSave={v => saveCell(o.id, c.k, v)} onCancel={() => setEdit(null)} /></td>;
                      return <td key={c.k} style={{ ...S.td, cursor: 'pointer' }} onClick={() => setEdit({ id: o.id, field: c.k })}>{cellVal(o, c)}</td>;
                    })}
                    <td style={S.td}><button onClick={() => delOrder(o.id)} style={S.delBtn}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddOrderModal onClose={() => setShowAdd(false)} onSave={addOrder} />}
      {showExport && <ExportModal month={month} onClose={() => setShowExport(false)} />}
    </div>
  );
}

function EditCell({ c, value, onSave, onCancel }) {
  const [v, setV] = useState(value ?? '');
  const commit = () => onSave(v);
  if (c.type === 'status') return <select autoFocus value={v} onChange={e => onSave(e.target.value)} onBlur={onCancel} style={S.editInput}>{STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select>;
  if (c.type === 'carrier') return <select autoFocus value={v} onChange={e => onSave(e.target.value)} onBlur={onCancel} style={S.editInput}><option value="">—</option>{CARRIERS.map(x => <option key={x}>{x}</option>)}</select>;
  return <input autoFocus type={c.type === 'money' || c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'} step="0.01" value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel(); }} style={S.editInput} />;
}

function AddOrderModal({ onClose, onSave }) {
  const [f, setF] = useState({ platform_order_id: '', order_date: new Date().toISOString().slice(0,10), status: 'to_ship', supplier: '', sku: '', qty: 1, per_item_cost: '', selling_price: '', prep_cost: '', label_cost: '', platform_fee: '', carrier: '', tracking_number: '', customer_name: '' });
  const set = (k,v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Add order</h2>
        <p style={{ color: '#64748B', fontSize: 12.5, margin: '0 0 16px' }}>Profit is calculated automatically.</p>
        <div style={S.formGrid}>
          <Fld label="Order ID"><input style={S.input} value={f.platform_order_id} onChange={e=>set('platform_order_id',e.target.value)} /></Fld>
          <Fld label="Order date"><input type="date" style={S.input} value={f.order_date} onChange={e=>set('order_date',e.target.value)} /></Fld>
          <Fld label="Status"><select style={S.input} value={f.status} onChange={e=>set('status',e.target.value)}>{STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}</select></Fld>
          <Fld label="Supplier"><input style={S.input} value={f.supplier} onChange={e=>set('supplier',e.target.value)} placeholder="Walmart, Costco…" /></Fld>
          <Fld label="SKU"><input style={S.input} value={f.sku} onChange={e=>set('sku',e.target.value)} /></Fld>
          <Fld label="Qty"><input type="number" style={S.input} value={f.qty} onChange={e=>set('qty',e.target.value)} /></Fld>
          <Fld label="Per item cost"><input type="number" step="0.01" style={S.input} value={f.per_item_cost} onChange={e=>set('per_item_cost',e.target.value)} /></Fld>
          <Fld label="Selling price"><input type="number" step="0.01" style={S.input} value={f.selling_price} onChange={e=>set('selling_price',e.target.value)} /></Fld>
          <Fld label="Platform fee"><input type="number" step="0.01" style={S.input} value={f.platform_fee} onChange={e=>set('platform_fee',e.target.value)} placeholder="auto if blank" /></Fld>
          <Fld label="Prep cost"><input type="number" step="0.01" style={S.input} value={f.prep_cost} onChange={e=>set('prep_cost',e.target.value)} /></Fld>
          <Fld label="Label cost"><input type="number" step="0.01" style={S.input} value={f.label_cost} onChange={e=>set('label_cost',e.target.value)} /></Fld>
          <Fld label="Carrier"><select style={S.input} value={f.carrier} onChange={e=>set('carrier',e.target.value)}><option value="">—</option>{CARRIERS.map(c=><option key={c}>{c}</option>)}</select></Fld>
          <Fld label="Tracking #"><input style={S.input} value={f.tracking_number} onChange={e=>set('tracking_number',e.target.value)} /></Fld>
          <Fld label="Customer"><input style={S.input} value={f.customer_name} onChange={e=>set('customer_name',e.target.value)} /></Fld>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={() => onSave(f)} style={S.btnPrimary}>Save order</button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ month, onClose }) {
  const [preset, setPreset] = useState('full');
  async function download() {
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ preset, month }) });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `OTSDesk_${preset}.xlsx`; a.click();
      URL.revokeObjectURL(url); onClose();
    } catch (e) { alert(e.message); }
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width: 400 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Export orders</h2>
        <label style={S.label}>Choose columns</label>
        <select style={S.input} value={preset} onChange={e => setPreset(e.target.value)}>
          <option value="full">Full (all columns)</option>
          <option value="customer">Customer & shipping</option>
          <option value="orderdet">Order details</option>
          <option value="fin">Financial (profit)</option>
        </select>
        <p style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>Exports {month === 'all' ? 'all months' : month}.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={download} style={S.btnPrimary}>Download .xlsx</button>
        </div>
      </div>
    </div>
  );
}
function Fld({ label, children }) { return <div><label style={S.label}>{label}</label>{children}</div>; }

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
  th: { textAlign: 'left', padding: '11px 12px', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 10.5, textTransform: 'uppercase', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' },
  tr: { borderBottom: '1px solid #F1F5F9' },
  td: { padding: '9px 12px', color: '#334155', whiteSpace: 'nowrap' },
  tdSerial: { padding: '9px 12px', fontWeight: 700, color: '#0D1B2A', background: '#F8FAFC' },
  editInput: { width: '100%', minWidth: 90, border: '1.5px solid #2563EB', borderRadius: 6, padding: '4px 6px', fontSize: 12, outline: 'none' },
  delBtn: { background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 14 },
  empty: { padding: 50, textAlign: 'center' },
  loading: { padding: 40, textAlign: 'center', color: '#94A3B8' },
  err: { background: '#FEF2F2', color: '#DC2626', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 12 },
  info: { background: '#EFF6FF', color: '#2563EB', padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(13,27,42,.5)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 16 },
  modal: { background: '#fff', borderRadius: 16, padding: 24, width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' },
};
