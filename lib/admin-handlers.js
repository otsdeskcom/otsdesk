/**
 * OTS Desk — Admin Console API handlers  (OWNER ONLY)
 * ---------------------------------------------------------------------------
 * Every function here must be called behind requireOwner() — role must be
 * 'owner'. Regular users can never reach these.
 *
 *   overview()   → KPI numbers: total/active/trial/paid/past_due/cancelled,
 *                  MRR, all-time revenue, source breakdown, growth series
 *   users(q)     → paginated user table with status, orders used, revenue
 *   activity(q)  → recent activity feed
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const ordersH = require('./orders-handlers');

/* ---------- OVERVIEW ---------- */
async function overview() {
  // user + subscription status counts
  const counts = await db.one(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE email_verified=TRUE)::int AS total_users,
      (SELECT COUNT(*) FROM users WHERE last_login_at > now() - interval '24 hours')::int AS active_24h,
      (SELECT COUNT(*) FROM subscriptions WHERE state='trialing')::int AS trial_users,
      (SELECT COUNT(*) FROM subscriptions WHERE state='active')::int AS paid_users,
      (SELECT COUNT(*) FROM subscriptions WHERE state='past_due')::int AS past_due,
      (SELECT COUNT(*) FROM subscriptions WHERE state='cancelled')::int AS cancelled
  `);

  const paid = counts.paid_users || 0;
  const mrr = Math.round(paid * 9.99 * 100) / 100;

  // all-time revenue: count of successful payments * price (from activity_log 'payment')
  const revRow = await db.one(
    `SELECT COALESCE(SUM((detail->>'amount')::numeric),0) AS revenue
     FROM activity_log WHERE event='payment'`);
  const revenue = Math.round(Number(revRow.revenue) * 100) / 100;

  // "how did you hear about us" breakdown
  const { rows: sources } = await db.query(
    `SELECT COALESCE(heard_from,'Unknown') AS source, COUNT(*)::int AS count
     FROM users WHERE email_verified=TRUE GROUP BY heard_from ORDER BY count DESC`);

  // signups per month (last 6 months)
  const { rows: growth } = await db.query(
    `SELECT to_char(created_at,'YYYY-MM') AS month, COUNT(*)::int AS signups
     FROM users WHERE email_verified=TRUE AND created_at > now() - interval '6 months'
     GROUP BY month ORDER BY month`);

  return {
    kpis: {
      totalUsers: counts.total_users,
      active24h: counts.active_24h,
      trialUsers: counts.trial_users,
      paidUsers: counts.paid_users,
      pastDue: counts.past_due,
      cancelled: counts.cancelled,
      mrr,
      revenue,
    },
    sources,
    growth,
  };
}

/* ---------- USERS TABLE ---------- */
async function users(q = {}) {
  const { search = '', status = 'all', limit = 50, offset = 0 } = q;
  const params = [];
  let where = 'WHERE u.email_verified=TRUE';
  if (search) {
    params.push('%' + search.toLowerCase() + '%');
    where += ` AND (LOWER(u.first_name||' '||u.last_name) LIKE $${params.length}
                 OR LOWER(u.email) LIKE $${params.length}
                 OR LOWER(u.primary_platform) LIKE $${params.length})`;
  }
  if (status && status !== 'all') {
    params.push(status);
    where += ` AND s.state = $${params.length}`;
  }
  params.push(limit, offset);

  const { rows } = await db.query(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.primary_platform, u.heard_from,
           u.created_at, u.last_login_at, s.state,
           (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id)::int AS total_orders
    FROM users u
    LEFT JOIN LATERAL (SELECT state FROM subscriptions WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) s ON TRUE
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

  return rows.map(r => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    email: r.email,
    platform: r.primary_platform,
    heardFrom: r.heard_from,
    signup: r.created_at,
    lastActive: r.last_login_at,
    status: r.state || 'trialing',
    orders: r.total_orders,
  }));
}

/* ---------- ACTIVITY FEED ---------- */
async function activity(q = {}) {
  const { limit = 30 } = q;
  const { rows } = await db.query(`
    SELECT a.event, a.detail, a.created_at,
           u.first_name, u.last_name, u.primary_platform
    FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC LIMIT $1`, [limit]);
  return rows.map(r => ({
    event: r.event,
    detail: r.detail,
    at: r.created_at,
    user: r.first_name ? `${r.first_name} ${r.last_name}` : 'System',
    platform: r.primary_platform,
  }));
}

/* ---------- owner guard ---------- */
function isOwner(user) { return user && user.role === 'owner'; }

module.exports = { overview, users, activity, isOwner };
