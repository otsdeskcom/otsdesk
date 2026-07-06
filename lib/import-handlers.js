/**
 * OTS Desk — Import handler (duplicate-safe merge)
 * ---------------------------------------------------------------------------
 * Takes already-parsed sheet rows (the Next.js route parses the file with
 * SheetJS and passes JSON here). For each row:
 *   - match existing order by (user_id, platform_order_id)
 *   - EXISTS → fill ONLY missing fields (never overwrite real data).
 *              Exception: platform_fee updates to the sheet's ACTUAL fee if
 *              feeActual=true and the value differs.
 *   - NEW    → insert (respecting the 250/cycle limit)
 * Returns a summary: added / updated / fieldsFilled / skipped / limitHit
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const { detectColumns, cellValue } = require('./columns');
const ordersH = require('./orders-handlers');

const MERGE_FIELDS = ['order_date','ship_by','est_delivery','exp_delivery','note','status',
  'supplier','supplier_order_id','supplier_est_delivery','sku','qty','per_item_cost','selling_price',
  'prep_cost','label_cost','platform_fee','refund_amount','carrier','tracking_number',
  'label_created_date','customer_name','customer_phone','address_line1','address_line2','city','state','zip'];

function isEmpty(v) { return v === '' || v === 0 || v == null; }

async function importRows(user, rows, opts = {}) {
  const feeActual = opts.feeActual !== false; // default true
  if (!rows || !rows.length) return { status: 400, data: { error: 'Sheet is empty' } };

  const headers = Object.keys(rows[0]);
  const map = detectColumns(headers);
  const mappedCount = Object.keys(map).length;

  let added = 0, updated = 0, fieldsFilled = 0, skipped = 0, limitHit = false;

  for (const row of rows) {
    const oid = cellValue(row, map, 'platform_order_id');
    const existing = oid
      ? await db.one('SELECT * FROM orders WHERE user_id=$1 AND platform_order_id=$2', [user.id, oid])
      : null;

    if (existing) {
      const patch = {};
      let filled = 0;
      for (const field of MERGE_FIELDS) {
        const v = cellValue(row, map, field);
        if (v === undefined) continue;
        const cur = existing[field];
        if (isEmpty(cur)) { patch[field] = v; filled++; }
        else if (field === 'platform_fee' && feeActual && Number(cur) !== Number(v)) {
          patch[field] = v; patch.fee_is_manual = true; filled++;
        }
      }
      if (filled > 0) {
        await ordersH.update(user, existing.id, patch);
        updated++; fieldsFilled += filled;
      } else skipped++;
    } else {
      // new order
      const lim = await ordersH.limit(user);
      if (lim.used >= ordersH.CYCLE_LIMIT) { limitHit = true; continue; }
      const body = {};
      for (const field of ['platform_order_id', ...MERGE_FIELDS]) {
        const v = cellValue(row, map, field);
        if (v !== undefined) body[field] = v;
      }
      const res = await ordersH.create(user, body);
      if (res.status === 200) added++;
      else if (res.status === 409) skipped++; // race dup
    }
  }

  await db.query('INSERT INTO activity_log(user_id,event,detail) VALUES($1,$2,$3)',
    [user.id, 'import', JSON.stringify({ added, updated, fieldsFilled, skipped })]);

  return { status: 200, data: {
    ok: true, rows: rows.length, columnsDetected: mappedCount, totalColumns: headers.length,
    added, updated, fieldsFilled, skipped, limitHit,
  }};
}

module.exports = { importRows };
