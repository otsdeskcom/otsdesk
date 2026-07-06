/**
 * OTS Desk — Settings API handlers
 * ---------------------------------------------------------------------------
 *   get(user)            → current settings (fees, cost defaults, layout, sort)
 *   update(user, patch)  → save any subset
 *   billingInfo(user)    → registration-cycle dates + next charge + reminder dates
 * Settings feed the order auto-fee and cost defaults.
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const ordersH = require('./orders-handlers');

async function get(userId) {
  let s = await db.one('SELECT * FROM user_settings WHERE user_id=$1', [userId]);
  if (!s) {
    s = await db.one('INSERT INTO user_settings(user_id) VALUES($1) RETURNING *', [userId]);
  }
  return {
    platformFees: s.platform_fees || [],
    defaultPrep: Number(s.default_prep),
    defaultLabel: Number(s.default_label),
    sortNewestFirst: s.sort_newest_first,
    columnLayout: s.column_layout || [],
  };
}

const ALLOWED = {
  platformFees: 'platform_fees',
  defaultPrep: 'default_prep',
  defaultLabel: 'default_label',
  sortNewestFirst: 'sort_newest_first',
  columnLayout: 'column_layout',
};

async function update(userId, patch) {
  const fields = Object.keys(patch).filter(k => ALLOWED[k]);
  if (!fields.length) return { status: 400, data: { error: 'Nothing to update' } };
  const cols = fields.map((k, i) => `${ALLOWED[k]}=$${i + 2}`).join(', ');
  const vals = fields.map(k => {
    const v = patch[k];
    // JSON columns need stringify
    if (k === 'platformFees' || k === 'columnLayout') return JSON.stringify(v);
    return v;
  });
  await db.query(
    `INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
  const row = await db.one(
    `UPDATE user_settings SET ${cols} WHERE user_id=$1 RETURNING *`, [userId, ...vals]);
  return { status: 200, data: { ok: true, settings: row } };
}

/* ---------- billing info for the account panel ---------- */
async function billingInfo(user) {
  const sub = await db.one(
    `SELECT * FROM subscriptions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [user.id]);
  const { start, end } = ordersH.cycleBounds(user.registered_at);
  const fmt = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const r7 = new Date(end); r7.setDate(r7.getDate() - 7);
  const r3 = new Date(end); r3.setDate(r3.getDate() - 3);

  return {
    plan: '$9.99/month',
    state: sub ? sub.state : 'trialing',
    registeredAt: fmt(user.registered_at),
    cycleStart: fmt(start),
    cycleEnd: fmt(end),
    nextCharge: fmt(end),
    amount: sub ? Number(sub.price_usd) : 9.99,
    trialEndsAt: sub && sub.trial_ends_at ? fmt(sub.trial_ends_at) : null,
    reminder7d: fmt(r7),
    reminder3d: fmt(r3),
  };
}

module.exports = { get, update, billingInfo };
