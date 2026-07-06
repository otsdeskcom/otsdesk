'use client';
import { useState, useEffect, useRef } from 'react';
import { api, getToken, money, pct } from '../../lib/client';
 
// Status → color (matches prototype)
const STATUS_LIST = [
  ['to_ship','To Ship','#F59E0B'], ['label_created','Label Created','#8B5CF6'],
  ['preparing','Preparing','#3B82F6'], ['on_hold','On Hold','#64748B'],
  ['on_the_way','On The Way','#0EA5E9'], ['in_transit','In Transit','#2563EB'],
  ['out_for_delivery','Out For Delivery','#06B6D4'], ['delivered','Delivered','#10B981'],
  ['completed','Completed','#059669'], ['cancelled','Cancelled','#94A3B8'],
  ['refunded','Refunded','#EF4444'],
];
const STATUS_COLOR = Object.fromEntries(STATUS_LIST.map(s => [s[0], s[2]]));
const STATUS_LABEL = Object.fromEntries(STATUS_LIST.map(s => [s[0], s[1]]));
const SUPPLIERS = ['Amazon','Walmart','eBay',"Sam's Club",'Costco','Target','Etsy','Home Depot',"Lowe's",'Best Buy','Other'];
const CARRIERS = ['USPS','UPS','FedEx','DHL','OnTrac','LaserShip','GLS','Amazon Logistics','Other'];
 
// All 30 columns (matching prototype), with edit type
const COLS = [
  { k:'serial_no', label:'S.No', ro:true, sticky:true },
  { k:'platform_order_id', label:'Platform Order ID', type:'text' },
  { k:'order_date', label:'Order Date', type:'date' },
  { k:'ship_by', label:'Ship By', type:'date' },
  { k:'est_delivery', label:'Est. Delivery', type:'date' },
  { k:'exp_delivery', label:'Expected Delivery (Carrier)', type:'date' },
  { k:'status', label:'Status', type:'status' },
  { k:'supplier', label:'Supplier', type:'supplier' },
  { k:'supplier_order_id', label:'Supplier Order ID', type:'text' },
  { k:'supplier_est_delivery', label:'Supplier Est. Delivery', type:'date' },
  { k:'sku', label:'Supplier SKU', type:'text' },
  { k:'qty', label:'QTY', type:'number' },
  { k:'per_item_cost', label:'Per Item Cost', type:'money' },
  { k:'item_cost', label:'Total Item Cost', ro:true, calc:'money' },
  { k:'selling_price', label:'Selling Price', type:'money' },
  { k:'prep_cost', label:'Prep', type:'money' },
  { k:'label_cost', label:'Label Cost', type:'money' },
  { k:'platform_fee', label:'Platform Fee', type:'money' },
  { k:'total_cost', label:'Total Cost', ro:true, calc:'money' },
  { k:'net_profit', label:'Net Profit', ro:true, calc:'money', profit:true },
  { k:'margin', label:'Margin %', ro:true, calc:'pct', profit:true },
  { k:'refund_amount', label:'Refund Amt', type:'money' },
  { k:'loss', label:'Loss', ro:true, calc:'money', loss:true },
  { k:'carrier', label:'Carrier', type:'carrier' },
  { k:'tracking_number', label:'Tracking #', type:'text' },
  { k:'label_created_date', label:'Label Created', type:'date' },
  { k:'note', label:'Note', type:'text' },
  { k:'customer_name', label:'Customer', type:'text' },
  { k:'customer_phone', label:'Phone', type:'text' },
  { k:'address_line1', label:'Address 1', type:'text' },
  { k:'address_line2', label:'Address 2', type:'text' },
  { k:'city', label:'City', type:'text' },
  { k:'state', label:'State', type:'text' },
  { k:'zip', label:'ZIP', type:'text' },
];
 
export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [months, setMonths] = useState([]);
  const [month, setMonth] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState({ used:0, limit:250, remaining:250 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [edit, setEdit] = useState(null);
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
    try { const r = await api('/orders', { method:'POST', body:JSON.stringify(body) }); if (r?.ok) { setShowAdd(false); loadAll(); } }
    catch (e) { alert(e.message); }
  }
  async function saveCell(id, field, value) {
    setEdit(null);
    try { await api(`/orders/${id}`, { method:'PATCH', body:JSON.stringify({ [field]: value }) }); loadAll(); }
    catch (e) { alert(e.message); }
  }
  async function delOrder(id) {
    if (!confirm('Delete this order?')) return;
    try { await api(`/orders/${id}`, { method:'DELETE' }); loadAll(); } catch (e) { alert(e.message); }
  }
  async function doImport(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setImportMsg('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/import', { method:'POST', headers:{ Authorization:`Bearer ${getToken()}` }, body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportMsg(`✓ ${data.added} added · ${data.updated} updated · ${data.fieldsFilled} fields filled · ${data.skipped} skipped${data.limitHit ? ' · limit reached' : ''}`);
      loadAll();
    } catch (e) { setImportMsg('Error: ' + e.message); }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }
 
  function display(o, c) {
    let v = o[c.k];
    if (c.k === 'serial_no') return String(o.serial_no).padStart(2,'0');
    if (c.type === 'date' || c.k.includes('date') || c.k.includes('delivery') || c.k.includes('ship_by')) return v ? String(v).slice(0,10) : '—';
    if (c.calc === 'money' || c.type === 'money') return v==null || v==='' ? (c.type==='money'?'—':money(0)) : money(v);
    if (c.calc === 'pct') return pct(v);
    if (c.k === 'status') return null; // rendered as pill
    return (v==null || v==='') ? '—' : v;
  }
 
  return (
    <div>
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>Orders</h1>
          <p style={S.sub}>{limit.used} / {limit.limit} orders this cycle · {limit.remaining} remaining · resets {limit.resetsAt}</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <input placeholder="Search order / customer / SKU / tracking…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadAll()} style={S.searchBox} />
          <button onClick={()=>setSort(s=>s==='newest'?'oldest':'newest')} style={S.btnGhost} title="Toggle sort">{sort==='newest'?'↓ Newest':'↑ Oldest'}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={doImport} style={{ display:'none' }} />
          <button onClick={()=>fileRef.current?.click()} style={S.btnGhost} disabled={importing}>{importing?'Importing…':'↑ Import'}</button>
          <button onClick={()=>setShowExport(true)} style={S.btnGhost}>↓ Export</button>
          <button onClick={()=>setShowAdd(true)} style={S.btnPrimary}>+ Add order</button>
        </div>
      </div>
 
      {importMsg && <div style={S.info}>{importMsg}</div>}
 
      <div style={S.tabs}>
        <button onClick={()=>setMonth('all')} style={{ ...S.tab, ...(month==='all'?S.tabActive:{}) }}>All</button>
        {months.map(m => (
          <button key={m.cycle_month} onClick={()=>setMonth(m.cycle_month)} style={{ ...S.tab, ...(month===m.cycle_month?S.tabActive:{}) }}>
            {m.cycle_month} <span style={S.tabCount}>{m.count}</span>
          </button>
        ))}
      </div>
 
      {err && <div style={S.err}>{err}</div>}
 
      <div style={S.tableWrap}>
        {loading ? <div style={S.loading}>Loading…</div> :
         orders.length === 0 ? (
          <div style={S.empty}>
            <p style={{ fontWeight:600, color:'#0D1B2A' }}>No orders yet</p>
            <p style={{ color:'#64748B', fontSize:13 }}>Add your first order or import a marketplace sheet (Walmart, TikTok, Amazon…).</p>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:12 }}>
              <button onClick={()=>fileRef.current?.click()} style={S.btnGhost}>↑ Import sheet</button>
              <button onClick={()=>setShowAdd(true)} style={S.btnPrimary}>+ Add order</button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={S.table}>
              <thead><tr>
                {COLS.map(c => <th key={c.k} style={{ ...S.th, ...(c.sticky?S.thSticky:{}) }}>{c.label}</th>)}
                <th style={S.th}></th>
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={S.tr}>
                    {COLS.map(c => {
                      const editing = edit?.id===o.id && edit?.field===c.k;
                      // Status pill (click to edit)
                      if (c.k === 'status') {
                        if (editing) return <td key={c.k} style={S.td}><StatusSelect value={o.status} onSave={v=>saveCell(o.id,'status',v)} onCancel={()=>setEdit(null)} /></td>;
                        return <td key={c.k} style={S.td} onClick={()=>setEdit({id:o.id,field:'status'})}>
                          <span style={{ ...S.pill, background:(STATUS_COLOR[o.status]||'#64748B')+'22', color:STATUS_COLOR[o.status]||'#64748B' }}>{STATUS_LABEL[o.status]||o.status}</span>
                        </td>;
                      }
                      if (c.ro) {
                        const color = c.profit ? (o[c.k]>=0?'#10B981':'#EF4444') : c.loss ? (o[c.k]>0?'#EF4444':'#94A3B8') : '#334155';
                        return <td key={c.k} style={{ ...(c.sticky?S.tdSticky:S.td), color, fontWeight:c.profit?700:400 }}>{display(o,c)}</td>;
                      }
                      if (editing) return <td key={c.k} style={S.td}><EditCell c={c} value={o[c.k]} onSave={v=>saveCell(o.id,c.k,v)} onCancel={()=>setEdit(null)} /></td>;
                      return <td key={c.k} style={{ ...S.td, cursor:'pointer' }} onClick={()=>setEdit({id:o.id,field:c.k})}>{display(o,c)}</td>;
                    })}
                    <td style={S.td}><button onClick={()=>delOrder(o.id)} style={S.delBtn} title="Delete">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
      {showAdd && <OrderModal onClose={()=>setShowAdd(false)} onSave={addOrder} />}
      {showExport && <ExportModal month={month} onClose={()=>setShowExport(false)} />}
    </div>
  );
}
 
function StatusSelect({ value, onSave, onCancel }) {
  return <select autoFocus value={value} onChange={e=>onSave(e.target.value)} onBlur={onCancel} style={S.editInput}>
    {STATUS_LIST.map(([k,l])=><option key={k} value={k}>{l}</option>)}
  </select>;
}
function EditCell({ c, value, onSave, onCancel }) {
  const [v, setV] = useState(value ?? '');
  const commit = () => onSave(v);
  if (c.type === 'supplier') return <input autoFocus list="suppliers" value={v} onChange={e=>setV(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')onCancel();}} style={S.editInput} />;
  if (c.type === 'carrier') return <select autoFocus value={v} onChange={e=>onSave(e.target.value)} onBlur={onCancel} style={S.editInput}><option value="">—</option>{CARRIERS.map(x=><option key={x}>{x}</option>)}</select>;
  const inputType = c.type==='money'||c.type==='number'?'number':c.type==='date'?'date':'text';
  return <input autoFocus type={inputType} step="0.01" value={c.type==='date'&&v?String(v).slice(0,10):v} onChange={e=>setV(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')onCancel();}} style={S.editInput} />;
}
 
function OrderModal({ onClose, onSave }) {
  const [f, setF] = useState({
    platform_order_id:'', order_date:new Date().toISOString().slice(0,10), ship_by:'', est_delivery:'', exp_delivery:'',
    status:'to_ship', supplier:'', supplier_order_id:'', supplier_est_delivery:'', sku:'', qty:1,
    per_item_cost:'', selling_price:'', prep_cost:'', label_cost:'', platform_fee:'', refund_amount:'',
    carrier:'', tracking_number:'', label_created_date:'', note:'',
    customer_name:'', customer_phone:'', address_line1:'', address_line2:'', city:'', state:'', zip:'',
  });
  const set = (k,v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h2 style={{ fontSize:18, fontWeight:700, margin:'0 0 4px' }}>Add order</h2>
        <p style={{ color:'#64748B', fontSize:12.5, margin:'0 0 18px' }}>Profit, margin and totals are calculated automatically.</p>
 
        <Section title="Order">
          <Fld label="Platform Order ID"><input style={S.input} value={f.platform_order_id} onChange={e=>set('platform_order_id',e.target.value)} placeholder="e.g. 200013456789" /></Fld>
          <Fld label="Order Date"><input type="date" style={S.input} value={f.order_date} onChange={e=>set('order_date',e.target.value)} /></Fld>
          <Fld label="Status"><select style={S.input} value={f.status} onChange={e=>set('status',e.target.value)}>{STATUS_LIST.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select></Fld>
          <Fld label="Ship By"><input type="date" style={S.input} value={f.ship_by} onChange={e=>set('ship_by',e.target.value)} /></Fld>
          <Fld label="Est. Delivery"><input type="date" style={S.input} value={f.est_delivery} onChange={e=>set('est_delivery',e.target.value)} /></Fld>
          <Fld label="Expected Delivery (Carrier)"><input type="date" style={S.input} value={f.exp_delivery} onChange={e=>set('exp_delivery',e.target.value)} /></Fld>
        </Section>
 
        <Section title="Sourcing">
          <Fld label="Supplier"><input list="suppliers" style={S.input} value={f.supplier} onChange={e=>set('supplier',e.target.value)} placeholder="Walmart, Costco…" /></Fld>
          <Fld label="Supplier Order ID"><input style={S.input} value={f.supplier_order_id} onChange={e=>set('supplier_order_id',e.target.value)} placeholder="e.g. 114-5567..." /></Fld>
          <Fld label="Supplier Est. Delivery"><input type="date" style={S.input} value={f.supplier_est_delivery} onChange={e=>set('supplier_est_delivery',e.target.value)} /></Fld>
          <Fld label="Supplier SKU"><input style={S.input} value={f.sku} onChange={e=>set('sku',e.target.value)} placeholder="SKU-001" /></Fld>
          <Fld label="QTY"><input type="number" style={S.input} value={f.qty} onChange={e=>set('qty',e.target.value)} /></Fld>
        </Section>
 
        <Section title="Costs & pricing">
          <Fld label="Per Item Cost"><input type="number" step="0.01" style={S.input} value={f.per_item_cost} onChange={e=>set('per_item_cost',e.target.value)} /></Fld>
          <Fld label="Selling Price"><input type="number" step="0.01" style={S.input} value={f.selling_price} onChange={e=>set('selling_price',e.target.value)} /></Fld>
          <Fld label="Platform Fee"><input type="number" step="0.01" style={S.input} value={f.platform_fee} onChange={e=>set('platform_fee',e.target.value)} placeholder="auto if blank" /></Fld>
          <Fld label="Prep"><input type="number" step="0.01" style={S.input} value={f.prep_cost} onChange={e=>set('prep_cost',e.target.value)} placeholder="default if blank" /></Fld>
          <Fld label="Label Cost"><input type="number" step="0.01" style={S.input} value={f.label_cost} onChange={e=>set('label_cost',e.target.value)} placeholder="default if blank" /></Fld>
          <Fld label="Refund Amt"><input type="number" step="0.01" style={S.input} value={f.refund_amount} onChange={e=>set('refund_amount',e.target.value)} /></Fld>
        </Section>
 
        <Section title="Shipping">
          <Fld label="Carrier"><select style={S.input} value={f.carrier} onChange={e=>set('carrier',e.target.value)}><option value="">—</option>{CARRIERS.map(c=><option key={c}>{c}</option>)}</select></Fld>
          <Fld label="Tracking #"><input style={S.input} value={f.tracking_number} onChange={e=>set('tracking_number',e.target.value)} placeholder="1Z999AA1…" /></Fld>
          <Fld label="Label Created"><input type="date" style={S.input} value={f.label_created_date} onChange={e=>set('label_created_date',e.target.value)} /></Fld>
        </Section>
 
        <Section title="Customer & address">
          <Fld label="Customer"><input style={S.input} value={f.customer_name} onChange={e=>set('customer_name',e.target.value)} /></Fld>
          <Fld label="Phone"><input style={S.input} value={f.customer_phone} onChange={e=>set('customer_phone',e.target.value)} /></Fld>
          <Fld label="Address 1"><input style={S.input} value={f.address_line1} onChange={e=>set('address_line1',e.target.value)} /></Fld>
          <Fld label="Address 2"><input style={S.input} value={f.address_line2} onChange={e=>set('address_line2',e.target.value)} placeholder="Optional" /></Fld>
          <Fld label="City"><input style={S.input} value={f.city} onChange={e=>set('city',e.target.value)} /></Fld>
          <Fld label="State"><input style={S.input} value={f.state} onChange={e=>set('state',e.target.value)} placeholder="TX" /></Fld>
          <Fld label="ZIP"><input style={S.input} value={f.zip} onChange={e=>set('zip',e.target.value)} /></Fld>
        </Section>
 
        <Section title="Note">
          <div style={{ gridColumn:'1 / -1' }}><Fld label="Note"><input style={S.input} value={f.note} onChange={e=>set('note',e.target.value)} placeholder="Optional" /></Fld></div>
        </Section>
 
        <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end', position:'sticky', bottom:0, background:'#fff', paddingTop:12 }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={()=>onSave(f)} style={S.btnPrimary}>Save order</button>
        </div>
      </div>
      <datalist id="suppliers">{SUPPLIERS.map(s=><option key={s} value={s} />)}</datalist>
    </div>
  );
}
 
function ExportModal({ month, onClose }) {
  const [preset, setPreset] = useState('full');
  async function download() {
    try {
      const res = await fetch('/api/export', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` }, body:JSON.stringify({ preset, month }) });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`OTSDesk_${preset}.xlsx`; a.click();
      URL.revokeObjectURL(url); onClose();
    } catch (e) { alert(e.message); }
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width:420 }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ fontSize:18, fontWeight:700, margin:'0 0 4px' }}>Export orders</h2>
        <p style={{ color:'#64748B', fontSize:12.5, margin:'0 0 16px' }}>Choose which columns to include.</p>
        <label style={S.label}>Column set</label>
        <select style={S.input} value={preset} onChange={e=>setPreset(e.target.value)}>
          <option value="full">Full — all 30 columns</option>
          <option value="fin">Financial — profit, margin, costs</option>
          <option value="customer">Customer & shipping address</option>
          <option value="orderdet">Order details & tracking</option>
        </select>
        <p style={{ color:'#94A3B8', fontSize:12, marginTop:8 }}>Exporting {month==='all'?'all months':month} to Excel (.xlsx).</p>
        <div style={{ display:'flex', gap:10, marginTop:18, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={S.btnGhost}>Cancel</button>
          <button onClick={download} style={S.btnPrimary}>Download .xlsx</button>
        </div>
      </div>
    </div>
  );
}
function Section({ title, children }) {
  return <div style={{ marginBottom:16 }}><div style={S.secTitle}>{title}</div><div style={S.formGrid}>{children}</div></div>;
}
function Fld({ label, children }) { return <div><label style={S.label}>{label}</label>{children}</div>; }
 
const S = {
  head:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 },
  h1:{ fontSize:22, fontWeight:700, color:'#0D1B2A', margin:0 },
  sub:{ color:'#64748B', fontSize:12.5, margin:'4px 0 0' },
  searchBox:{ padding:'8px 12px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, outline:'none', width:260 },
  btnPrimary:{ background:'#2563EB', color:'#fff', border:'none', padding:'8px 16px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' },
  btnGhost:{ background:'#fff', color:'#475569', border:'1px solid #E2E8F0', padding:'8px 14px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' },
  tabs:{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 },
  tab:{ padding:'6px 12px', borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', color:'#475569', fontSize:12.5, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 },
  tabActive:{ background:'#0D1B2A', color:'#fff', borderColor:'#0D1B2A' },
  tabCount:{ background:'rgba(0,0,0,.1)', borderRadius:20, padding:'1px 7px', fontSize:11 },
  tableWrap:{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, overflow:'hidden' },
  table:{ width:'100%', borderCollapse:'collapse', fontSize:12 },
  th:{ textAlign:'left', padding:'10px 11px', background:'#F8FAFC', color:'#64748B', fontWeight:600, fontSize:10, textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:'1px solid #E2E8F0', letterSpacing:.3 },
  thSticky:{ position:'sticky', left:0, zIndex:2, background:'#F1F5F9' },
  tr:{ borderBottom:'1px solid #F1F5F9' },
  td:{ padding:'8px 11px', color:'#334155', whiteSpace:'nowrap' },
  tdSticky:{ padding:'8px 11px', fontWeight:700, color:'#0D1B2A', background:'#F8FAFC', position:'sticky', left:0, zIndex:1 },
  pill:{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, whiteSpace:'nowrap', cursor:'pointer' },
  editInput:{ width:'100%', minWidth:100, border:'1.5px solid #2563EB', borderRadius:6, padding:'4px 6px', fontSize:12, outline:'none' },
  delBtn:{ background:'none', border:'none', color:'#CBD5E1', cursor:'pointer', fontSize:14 },
  empty:{ padding:50, textAlign:'center' },
  loading:{ padding:40, textAlign:'center', color:'#94A3B8' },
  err:{ background:'#FEF2F2', color:'#DC2626', padding:12, borderRadius:10, fontSize:13, marginBottom:12 },
  info:{ background:'#EFF6FF', color:'#2563EB', padding:12, borderRadius:10, fontSize:13, marginBottom:12 },
  overlay:{ position:'fixed', inset:0, background:'rgba(13,27,42,.5)', display:'grid', placeItems:'center', zIndex:60, padding:16 },
  modal:{ background:'#fff', borderRadius:16, padding:24, width:720, maxWidth:'100%', maxHeight:'92vh', overflowY:'auto' },
  secTitle:{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:.5, marginBottom:10, paddingBottom:6, borderBottom:'1px solid #F1F5F9' },
  formGrid:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 },
  label:{ display:'block', fontSize:11, fontWeight:600, color:'#475569', marginBottom:4 },
  input:{ width:'100%', padding:'8px 10px', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' },
};
