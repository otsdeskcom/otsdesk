/**
 * OTS Desk — Inventory handler
 * ---------------------------------------------------------------------------
 *   list   → each SKU with per-item cost, sold (auto from orders), remaining,
 *            stock value, low-stock flag
 *   add    → new SKU or accumulate into an existing one
 *   remove → delete a SKU row
 * Sold units are computed LIVE from the orders table (excl. cancelled), so
 * stock always reflects real order activity.
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const { computeInventory } = require('./calc');

async function list(userId) {
  const { rows: inv } = await db.query('SELECT * FROM inventory WHERE user_id=$1 ORDER BY sku', [userId]);
  // sold per sku (exclude cancelled)
  const { rows: sold } = await db.query(
    `SELECT sku, COALESCE(SUM(qty),0)::int AS sold FROM orders
     WHERE user_id=$1 AND status <> 'cancelled' AND sku IS NOT NULL GROUP BY sku`, [userId]);
  const soldMap = {}; sold.forEach(s => soldMap[String(s.sku).toLowerCase()] = s.sold);
  return inv.map(it => {
    const c = computeInventory(it, soldMap[String(it.sku).toLowerCase()] || 0);
    return { ...it, ...c };
  });
}

async function add(user, body) {
  const sku = (body.sku || '').trim();
  if (!sku) return { status: 400, data: { error: 'SKU is required' } };
  const qty = Number(body.qty_added) || 0;
  const cost = Number(body.purchase_cost) || 0;
  const exp = Number(body.other_expense) || 0;

  const existing = await db.one('SELECT * FROM inventory WHERE user_id=$1 AND sku=$2', [user.id, sku]);
  let row;
  if (existing) {
    row = await db.one(
      `UPDATE inventory SET qty_added=qty_added+$3, purchase_cost=purchase_cost+$4,
       other_expense=other_expense+$5 WHERE id=$1 AND user_id=$2 RETURNING *`,
      [existing.id, user.id, qty, cost, exp]);
  } else {
    row = await db.one(
      `INSERT INTO inventory(user_id,sku,source,qty_added,purchase_cost,other_expense)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user.id, sku, body.source || null, qty, cost, exp]);
  }
  return { status: 200, data: { ok: true, item: row } };
}

async function remove(user, id) {
  const r = await db.one('DELETE FROM inventory WHERE id=$1 AND user_id=$2 RETURNING id', [id, user.id]);
  if (!r) return { status: 404, data: { error: 'Not found' } };
  return { status: 200, data: { ok: true } };
}

module.exports = { list, add, remove };
