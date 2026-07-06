/**
 * OTS Desk — Orders API handlers
 * ---------------------------------------------------------------------------
 * The heart of the system. Handles:
 *   list    → orders for a user, filtered by month tab, searched, sorted
 *   create  → add an order (auto serial per cycle-month, locked to date)
 *   update  → edit a cell (recomputes nothing in DB; calc is derived on read)
 *   remove  → delete an order
 *   months  → list of month tabs with counts
 *   limit   → 250/cycle usage on the user's registration-date cycle
 *
 * Serial number rule (as agreed):
 *   - S.No is assigned per user PER cycle-month, locked to ORDER DATE order
 *     (oldest = 01). Display can be Newest-first, but the number stays with
 *     its row and never shifts.
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const { computeOrder, autoPlatformFee } = require('./calc');

const CYCLE_LIMIT = 250;

/* ---------- billing-cycle helpers (registration-date based) ---------- */
function cycleBounds(registeredAt, now = new Date()) {
  const reg = new Date(registeredAt);
  const day = Math.min(reg.getDate(), 28);            // clamp for short months
  let start = new Date(now.getFullYear(), now.getMonth(), day);
  if (start > now) start = new Date(now.getFullYear(), now.getMonth() - 1, day);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day);
  return { start, end };
}
function cycleMonthKey(dateStr) { return String(dateStr).slice(0, 7); } // 'YYYY-MM'

/* ---------- attach derived calc fields to a row ---------- */
function withCalc(o) {
  const c = computeOrder(o);
  return { ...o, item_cost: c.itemCost, total_cost: c.totalCost,
           net_profit: c.netProfit, margin: c.margin, loss: c.loss };
}

/* ---------- LIST ---------- */
async function list(userId, q = {}) {
  const { month = 'all', search = '', sort = 'newest' } = q;
  const params = [userId];
  let sql = 'SELECT * FROM orders WHERE user_id=$1';
  if (month && month !== 'all') { params.push(month); sql += ` AND cycle_month=$${params.length}`; }
  if (search) {
    params.push('%' + search.toLowerCase() + '%');
    const i = params.length;
    sql += ` AND (LOWER(platform_order_id) LIKE $${i} OR LOWER(customer_name) LIKE $${i}
             OR LOWER(sku) LIKE $${i} OR LOWER(tracking_number) LIKE $${i})`;
  }
  // Always order by DATE for serial stability, then apply display direction.
  sql += ' ORDER BY order_date ASC, created_at ASC';
  const { rows } = await db.query(sql, params);

  // Assign per-month serials locked to date order (01 = earliest in that month).
  const byMonth = {};
  for (const r of rows) {
    const m = r.cycle_month || cycleMonthKey(r.order_date);
    byMonth[m] = byMonth[m] || 0;
    r.serial_no = ++byMonth[m];
  }
  let out = rows.map(withCalc);
  if (sort === 'newest') out = out.reverse();  // display newest first, serial stays glued
  return out;
}

/* ---------- MONTH TABS ---------- */
async function months(userId) {
  const { rows } = await db.query(
    `SELECT cycle_month, COUNT(*)::int AS count FROM orders
     WHERE user_id=$1 GROUP BY cycle_month ORDER BY cycle_month DESC`, [userId]);
  return rows;
}

/* ---------- LIMIT (current cycle usage) ---------- */
async function limit(user) {
  const { start, end } = cycleBounds(user.registered_at);
  const row = await db.one(
    `SELECT COUNT(*)::int AS used FROM orders
     WHERE user_id=$1 AND order_date >= $2 AND order_date < $3`,
    [user.id, start.toISOString().slice(0,10), end.toISOString().slice(0,10)]);
  return { used: row.used, limit: CYCLE_LIMIT, resetsAt: end.toISOString().slice(0,10),
           remaining: Math.max(0, CYCLE_LIMIT - row.used) };
}

/* ---------- CREATE ---------- */
async function create(user, body) {
  // enforce 250/cycle
  const lim = await limit(user);
  if (lim.used >= CYCLE_LIMIT)
    return { status: 403, data: { error: 'Monthly limit reached (250). Higher limits coming soon.' } };

  const orderDate = body.order_date || new Date().toISOString().slice(0,10);
  const cycle_month = cycleMonthKey(orderDate);

  // auto platform fee unless user typed one
  let fee = Number(body.platform_fee) || 0;
  const feeManual = !!body.fee_is_manual;
  if (!feeManual && !fee) {
    const settings = await db.one('SELECT platform_fees FROM user_settings WHERE user_id=$1', [user.id]);
    fee = autoPlatformFee(Number(body.selling_price)||0, body.supplier, body.category,
                          settings ? settings.platform_fees : []);
  }

  try {
    const o = await db.one(
      `INSERT INTO orders(user_id,platform_order_id,order_date,ship_by,est_delivery,
        exp_delivery,note,status,supplier,supplier_order_id,supplier_est_delivery,sku,
        qty,per_item_cost,selling_price,prep_cost,label_cost,platform_fee,fee_is_manual,
        refund_amount,carrier,tracking_number,label_created_date,customer_name,customer_phone,
        address_line1,address_line2,city,state,zip,cycle_month)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31) RETURNING *`,
      [user.id, body.platform_order_id||null, orderDate, body.ship_by||null, body.est_delivery||null,
       body.exp_delivery||null, body.note||null, body.status||'to_ship', body.supplier||null,
       body.supplier_order_id||null, body.supplier_est_delivery||null, body.sku||null,
       Number(body.qty)||1, Number(body.per_item_cost)||0, Number(body.selling_price)||0,
       body.prep_cost!=null?Number(body.prep_cost):null, body.label_cost!=null?Number(body.label_cost):null,
       fee, feeManual, Number(body.refund_amount)||0, body.carrier||null, body.tracking_number||null,
       body.label_created_date||null, body.customer_name||null, body.customer_phone||null,
       body.address_line1||null, body.address_line2||null, body.city||null, body.state||null,
       body.zip||null, cycle_month]);
    await db.query('INSERT INTO activity_log(user_id,event,detail) VALUES($1,$2,$3)',
      [user.id, 'order_create', JSON.stringify({ id: o.id, cycle_month })]);
    return { status: 200, data: { ok: true, order: withCalc(o) } };
  } catch (e) {
    if (e.code === '23505') // unique violation on (user_id, platform_order_id)
      return { status: 409, data: { error: 'An order with this Platform Order ID already exists' } };
    throw e;
  }
}

/* ---------- UPDATE (edit a cell / fields) ---------- */
const EDITABLE = new Set(['platform_order_id','order_date','ship_by','est_delivery','exp_delivery',
  'note','status','supplier','supplier_order_id','supplier_est_delivery','sku','qty','per_item_cost',
  'selling_price','prep_cost','label_cost','platform_fee','fee_is_manual','refund_amount','carrier',
  'tracking_number','label_created_date','customer_name','customer_phone','address_line1',
  'address_line2','city','state','zip']);

async function update(user, orderId, patch) {
  const fields = Object.keys(patch).filter(k => EDITABLE.has(k));
  if (!fields.length) return { status: 400, data: { error: 'No editable fields' } };

  // if platform_fee edited directly, mark it manual so auto-calc won't override
  if (fields.includes('platform_fee') && !fields.includes('fee_is_manual')) {
    patch.fee_is_manual = true; fields.push('fee_is_manual');
  }
  // if order_date changes, move cycle_month too
  if (fields.includes('order_date')) { patch.cycle_month = cycleMonthKey(patch.order_date); fields.push('cycle_month'); }

  const sets = fields.map((f, i) => `${f}=$${i + 3}`).join(', ');
  const vals = fields.map(f => patch[f]);
  const o = await db.one(
    `UPDATE orders SET ${sets} WHERE id=$1 AND user_id=$2 RETURNING *`,
    [orderId, user.id, ...vals]);
  if (!o) return { status: 404, data: { error: 'Order not found' } };
  return { status: 200, data: { ok: true, order: withCalc(o) } };
}

/* ---------- DELETE ---------- */
async function remove(user, orderId) {
  const o = await db.one('DELETE FROM orders WHERE id=$1 AND user_id=$2 RETURNING id', [orderId, user.id]);
  if (!o) return { status: 404, data: { error: 'Order not found' } };
  return { status: 200, data: { ok: true } };
}

module.exports = { list, months, limit, create, update, remove, cycleBounds, cycleMonthKey, withCalc, CYCLE_LIMIT };
