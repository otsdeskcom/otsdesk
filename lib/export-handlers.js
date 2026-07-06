/**
 * OTS Desk — Export handler
 * ---------------------------------------------------------------------------
 * Builds the data array for an Excel export. The Next.js route turns this into
 * an .xlsx with SheetJS. Supports:
 *   preset: full | customer | orderdet | fin | custom
 *   selection: all | ids[] | serial range (from,to) within a month
 *   Derived columns (item_cost, total_cost, net_profit, margin, loss) included
 *   via withCalc so exported numbers match the grid.
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const { FIELD_LABELS } = require('./columns');
const ordersH = require('./orders-handlers');

const PRESETS = {
  customer: ['serial_no','platform_order_id','customer_name','customer_phone','address_line1','address_line2','city','state','zip'],
  orderdet: ['serial_no','platform_order_id','order_date','ship_by','est_delivery','exp_delivery','status','supplier','supplier_order_id','supplier_est_delivery','sku','qty','carrier','tracking_number','label_created_date','note'],
  fin:      ['serial_no','platform_order_id','order_date','selling_price','qty','per_item_cost','item_cost','prep_cost','label_cost','platform_fee','total_cost','net_profit','margin','refund_amount','loss'],
};
const ALL_FIELDS = Object.keys(FIELD_LABELS);

async function buildExport(user, opts = {}) {
  const { preset = 'full', month = 'all', ids = null, from = null, to = null, columns = null } = opts;

  // fetch orders (with serials + calc) using the same list logic as the grid
  let orders = await ordersH.list(user.id, { month, sort: 'oldest' });

  // selection
  if (Array.isArray(ids) && ids.length) {
    const set = new Set(ids);
    orders = orders.filter(o => set.has(o.id));
  } else if (from != null && to != null) {
    orders = orders.filter(o => o.serial_no >= from && o.serial_no <= to);
  }

  // columns
  let fields;
  if (preset === 'full') fields = ALL_FIELDS;
  else if (preset === 'custom' && columns && columns.length) fields = columns;
  else fields = PRESETS[preset] || ALL_FIELDS;

  const data = orders.map(o => {
    const row = {};
    for (const f of fields) {
      const label = FIELD_LABELS[f] || f;
      let v = o[f];
      if (f === 'serial_no') v = String(o.serial_no).padStart(2, '0');
      if (f === 'margin' && v != null) v = v + '%';
      row[label] = v == null ? '' : v;
    }
    return row;
  });

  await db.query('INSERT INTO activity_log(user_id,event,detail) VALUES($1,$2,$3)',
    [user.id, 'export', JSON.stringify({ preset, count: data.length })]);

  return { rows: data, count: data.length, fields };
}

module.exports = { buildExport, PRESETS };
