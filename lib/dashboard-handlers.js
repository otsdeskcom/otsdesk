/**
 * OTS Desk — Dashboard API handlers
 * ---------------------------------------------------------------------------
 * Provides the numbers behind the dashboard for any date range.
 * All money totals come from lib/calc.aggregate(), so the dashboard can NEVER
 * disagree with the order grid — one source of truth.
 *
 *   summary(user, range)  → KPI cards + chart series for the selected range
 * Ranges: day | week | month | quarter | year | custom(from,to)
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const { aggregate, computeOrder } = require('./calc');

/* ---------- resolve a range into [from,to] ISO dates ---------- */
function resolveRange(range, from, to, now = new Date()) {
  const iso = d => d.toISOString().slice(0, 10);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'custom' && from && to) return { from, to };
  let start;
  switch (range) {
    case 'day':     start = new Date(today); break;
    case 'week':    start = new Date(today); start.setDate(start.getDate() - 6); break;
    case 'quarter': start = new Date(today); start.setDate(start.getDate() - 91); break;
    case 'year':    start = new Date(today); start.setFullYear(start.getFullYear() - 1); break;
    case 'month':
    default:        start = new Date(today); start.setDate(start.getDate() - 30); break;
  }
  return { from: iso(start), to: iso(today) };
}

/* ---------- SUMMARY ---------- */
async function summary(userId, q = {}) {
  const { range = 'month', from, to } = q;
  const r = resolveRange(range, from, to);

  const { rows } = await db.query(
    `SELECT * FROM orders WHERE user_id=$1 AND order_date >= $2 AND order_date <= $3
     ORDER BY order_date ASC`, [userId, r.from, r.to]);

  // KPI totals (single source of truth)
  const totals = aggregate(rows);

  // --- chart 1: Revenue vs Net Profit by day ---
  const byDay = {};
  for (const o of rows) {
    if (o.status === 'cancelled') continue;
    const c = computeOrder(o);
    const d = String(o.order_date).slice(0, 10);
    byDay[d] = byDay[d] || { revenue: 0, profit: 0 };
    byDay[d].revenue += Number(o.selling_price) || 0;
    byDay[d].profit  += c.netProfit;
  }
  const trend = Object.keys(byDay).sort().map(d => ({
    date: d,
    revenue: Math.round(byDay[d].revenue * 100) / 100,
    profit:  Math.round(byDay[d].profit * 100) / 100,
  }));

  // --- chart 2: Orders by status (donut) ---
  const statusCount = {};
  for (const o of rows) statusCount[o.status] = (statusCount[o.status] || 0) + 1;
  const byStatus = Object.entries(statusCount).map(([status, count]) => ({ status, count }));

  // --- chart 3: Cost breakdown (bars) ---
  const costBreakdown = [
    { label: 'Buying cost',    value: totals.buyingCost },
    { label: 'Platform fees',  value: totals.fees },
    { label: 'Shipping/labels',value: totals.shipping },
    { label: 'Prep',           value: totals.prep },
    { label: 'Refunds',        value: totals.refunds },
  ];

  // --- chart 4: Sales by supplier (bars) ---
  const supMap = {};
  for (const o of rows) {
    if (o.status === 'cancelled') continue;
    supMap[o.supplier || 'Unknown'] = (supMap[o.supplier || 'Unknown'] || 0) + (Number(o.selling_price) || 0);
  }
  const bySupplier = Object.entries(supMap)
    .map(([supplier, value]) => ({ supplier, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value).slice(0, 6);

  return {
    range: r,
    kpis: {
      totalOrders: totals.orders,
      revenue: totals.revenue,
      buyingCost: totals.buyingCost,
      shipping: totals.shipping,
      platformFees: totals.fees,
      prep: totals.prep,
      refunds: totals.refunds,
      refundedCount: totals.refundedCount,
      cancelled: totals.cancelled,
      notShipped: totals.notShipped,
      inTransit: totals.inTransit,
      netProfit: totals.netProfit,
      margin: totals.margin,
    },
    charts: { trend, byStatus, costBreakdown, bySupplier },
  };
}

module.exports = { summary, resolveRange };
