/**
 * OTS Desk — Order Calculations (single source of truth)
 * ---------------------------------------------------------------------------
 * EVERY profit/margin/cost number in the whole system comes from here.
 * The order grid, the dashboard totals, the exports and the reports ALL call
 * these functions. Because the formulas live in ONE place, they can never
 * "break" the way spreadsheet cell-formulas do.
 *
 * Formulas (exactly as agreed):
 *   Total Item Cost = qty * per_item_cost
 *   Total Cost      = item cost + prep + label + platform fee
 *   Net Profit      = selling - total cost        (Refunded: selling - refund - total cost)
 *                     (Cancelled: profit = 0)
 *   Margin %        = net profit / selling * 100
 *   Loss            = |net profit| when profit < 0
 * ---------------------------------------------------------------------------
 */

/** round to 2 decimals safely */
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Compute all derived money fields for a single order row.
 * @param {object} o - raw order fields from DB / form
 * @returns {{itemCost:number,totalCost:number,netProfit:number,margin:number,loss:number}}
 */
function computeOrder(o) {
  const qty        = Number(o.qty)           || 0;
  const perItem    = Number(o.per_item_cost) || 0;
  const selling    = Number(o.selling_price) || 0;
  const prep       = Number(o.prep_cost)     || 0;
  const label      = Number(o.label_cost)    || 0;
  const fee        = Number(o.platform_fee)  || 0;
  const refund     = Number(o.refund_amount) || 0;
  const status     = o.status;

  const itemCost  = r2(qty * perItem);
  const totalCost = r2(itemCost + prep + label + fee);

  let netProfit;
  if (status === 'cancelled') {
    netProfit = 0;                                   // no sale, no profit/loss
  } else if (status === 'refunded') {
    netProfit = r2((selling - refund) - totalCost);  // money returned to buyer
  } else {
    netProfit = r2(selling - totalCost);
  }

  const margin = (selling > 0 && status !== 'cancelled')
    ? r2((netProfit / selling) * 100)
    : 0;

  const loss = netProfit < 0 ? r2(Math.abs(netProfit)) : 0;

  return { itemCost, totalCost, netProfit, margin, loss };
}

/**
 * Auto platform fee from the user's saved settings.
 * Priority: exact platform+category match → platform-only default → 0.
 * Manual fee always wins (handled by caller: skip this when fee_is_manual).
 */
function autoPlatformFee(sellingPrice, supplierOrPlatform, category, platformFees = []) {
  if (!sellingPrice || sellingPrice <= 0) return 0;
  const plat = (supplierOrPlatform || '').toLowerCase();
  const cat  = (category || '').toLowerCase();

  // 1) platform + category exact
  let rule = platformFees.find(f =>
    (f.platform || '').toLowerCase() === plat &&
    (f.category  || '').toLowerCase() === cat && cat !== '');
  // 2) platform-only (category null/empty)
  if (!rule) rule = platformFees.find(f =>
    (f.platform || '').toLowerCase() === plat && !f.category);

  if (!rule) return 0;
  return r2(sellingPrice * (Number(rule.pct) || 0) / 100);
}

/**
 * Aggregate a list of orders into dashboard totals for a date range.
 * Cancelled orders are excluded from money totals but counted separately.
 */
function aggregate(orders) {
  const t = {
    orders: orders.length,
    revenue: 0, buyingCost: 0, shipping: 0, prep: 0, fees: 0,
    refunds: 0, netProfit: 0,
    cancelled: 0, refundedCount: 0, notShipped: 0, inTransit: 0,
  };
  const UNSHIPPED = ['to_ship', 'preparing', 'on_hold', 'label_created'];
  const TRANSIT   = ['on_the_way', 'in_transit', 'out_for_delivery'];

  for (const o of orders) {
    const c = computeOrder(o);
    if (o.status !== 'cancelled') {
      t.revenue    += Number(o.selling_price) || 0;
      t.buyingCost += c.itemCost;
      t.shipping   += Number(o.label_cost) || 0;
      t.prep       += Number(o.prep_cost)  || 0;
      t.fees       += Number(o.platform_fee) || 0;
      t.netProfit  += c.netProfit;
    }
    if (o.status === 'cancelled') t.cancelled++;
    if (o.status === 'refunded') { t.refundedCount++; t.refunds += Number(o.refund_amount) || 0; }
    if (UNSHIPPED.includes(o.status)) t.notShipped++;
    if (TRANSIT.includes(o.status))   t.inTransit++;
  }
  // round all money
  for (const k of ['revenue','buyingCost','shipping','prep','fees','refunds','netProfit']) t[k] = r2(t[k]);
  t.margin = t.revenue > 0 ? r2(t.netProfit / t.revenue * 100) : 0;
  return t;
}

/**
 * Live inventory for a SKU: remaining = qty_added - sold (from orders).
 * @param {object} inv    - inventory row
 * @param {number} sold   - units sold for this SKU (computed from orders, excl. cancelled)
 */
function computeInventory(inv, sold) {
  const qtyAdded = Number(inv.qty_added) || 0;
  const perItem  = qtyAdded > 0
    ? r2((Number(inv.purchase_cost) + Number(inv.other_expense)) / qtyAdded)
    : 0;
  const remaining = qtyAdded - (sold || 0);
  const stockValue = remaining > 0 ? r2(remaining * perItem) : 0;
  const lowStock = remaining <= 3;
  return { perItem, sold: sold || 0, remaining, stockValue, lowStock,
           outOfStock: remaining <= 0 };
}

module.exports = { r2, computeOrder, autoPlatformFee, aggregate, computeInventory };
