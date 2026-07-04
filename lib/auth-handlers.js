/**
 * OTS Desk — Auth API handlers
 * ---------------------------------------------------------------------------
 * Framework-agnostic functions used by the Next.js API routes.
 * Each takes a plain `body` object and returns { status, data }.
 * Flow:
 *   signup  → creates user (unverified) + sends OTP
 *   verifyOtp (signup) → marks verified, starts trial subscription, returns tokens
 *   login   → email+password → tokens
 *   forgot  → sends reset OTP
 *   verifyOtp (reset) → returns a short reset ticket
 *   resetPassword → sets new password
 * ---------------------------------------------------------------------------
 */
const db = require('./db');
const auth = require('./auth');
const { sendEmail, otpEmail } = require('./email');

async function logActivity(userId, event, detail) {
  try { await db.query('INSERT INTO activity_log(user_id,event,detail) VALUES($1,$2,$3)',
    [userId, event, detail ? JSON.stringify(detail) : null]); } catch {}
}

/* ---------- SIGNUP ---------- */
async function signup(body) {
  const { firstName, lastName, email, phone, companyName,
          password, primaryPlatform, heardFrom } = body;
  if (!firstName || !lastName || !email || !phone || !password)
    return { status: 400, data: { error: 'Missing required fields' } };
  if (password.length < 8)
    return { status: 400, data: { error: 'Password must be at least 8 characters' } };

  const existing = await db.one('SELECT id, email_verified FROM users WHERE email=$1', [email]);
  if (existing && existing.email_verified)
    return { status: 409, data: { error: 'An account with this email already exists' } };

  const password_hash = await auth.hashPassword(password);

  let user;
  if (existing) {
    // re-signup on an unverified account: update details
    user = await db.one(
      `UPDATE users SET first_name=$2,last_name=$3,phone=$4,company_name=$5,
        password_hash=$6,primary_platform=$7,heard_from=$8 WHERE id=$1 RETURNING *`,
      [existing.id, firstName, lastName, phone, companyName || null,
       password_hash, primaryPlatform || null, heardFrom || null]);
  } else {
    user = await db.one(
      `INSERT INTO users(first_name,last_name,email,phone,company_name,
        password_hash,primary_platform,heard_from)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [firstName, lastName, email, phone, companyName || null,
       password_hash, primaryPlatform || null, heardFrom || null]);
    // create default settings row
    await db.query('INSERT INTO user_settings(user_id) VALUES($1) ON CONFLICT DO NOTHING', [user.id]);
  }

  await issueOtp(email, 'signup', user.id);
  return { status: 200, data: { ok: true, message: 'OTP sent to email', email } };
}

/* ---------- issue OTP helper ---------- */
async function issueOtp(email, purpose, userId = null) {
  const { code, code_hash, expires_at } = auth.generateOtp();
  await db.query(
    `INSERT INTO otp_codes(user_id,email,code_hash,purpose,expires_at)
     VALUES($1,$2,$3,$4,$5)`,
    [userId, email, code_hash, purpose, expires_at]);
  const tpl = otpEmail(code, purpose);
  await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
}

/* ---------- VERIFY OTP ---------- */
async function verifyOtp(body) {
  const { email, code, purpose } = body;
  if (!email || !code || !purpose)
    return { status: 400, data: { error: 'Missing fields' } };

  const otpRow = await db.one(
    `SELECT * FROM otp_codes WHERE email=$1 AND purpose=$2 AND consumed=FALSE
     ORDER BY created_at DESC LIMIT 1`, [email, purpose]);

  const check = auth.checkOtp(code, otpRow);
  if (!check.ok) {
    if (otpRow) await db.query('UPDATE otp_codes SET attempts=attempts+1 WHERE id=$1', [otpRow.id]);
    return { status: 400, data: { error: 'Invalid or expired code', reason: check.reason } };
  }
  await db.query('UPDATE otp_codes SET consumed=TRUE WHERE id=$1', [otpRow.id]);

  if (purpose === 'signup') {
    const user = await db.one(
      'UPDATE users SET email_verified=TRUE WHERE email=$1 RETURNING *', [email]);
    // start 1-month free trial
    const trialEnd = new Date(); trialEnd.setMonth(trialEnd.getMonth() + 1);
    await db.query(
      `INSERT INTO subscriptions(user_id,state,provider,trial_ends_at,
        current_period_start,current_period_end)
       VALUES($1,'trialing','manual_beta',$2,now(),$2)`,
      [user.id, trialEnd]);
    await logActivity(user.id, 'signup', { platform: user.primary_platform, heard: user.heard_from });
    await logActivity(user.id, 'otp_verified', null);
    return { status: 200, data: tokenBundle(user) };
  }

  // reset flow: return a short-lived reset ticket (10 min)
  const ticket = auth.signAccess({ id: 'reset', email, role: 'reset' });
  return { status: 200, data: { ok: true, resetTicket: ticket } };
}

/* ---------- LOGIN ---------- */
async function login(body) {
  const { email, password } = body;
  if (!email || !password) return { status: 400, data: { error: 'Missing credentials' } };
  const user = await db.one('SELECT * FROM users WHERE email=$1', [email]);
  if (!user || !(await auth.verifyPassword(password, user.password_hash)))
    return { status: 401, data: { error: 'Email or password is incorrect' } };
  if (!user.email_verified) {
    await issueOtp(email, 'signup', user.id);
    return { status: 403, data: { error: 'Email not verified', needOtp: true, email } };
  }
  await db.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);
  await logActivity(user.id, 'login', null);
  return { status: 200, data: tokenBundle(user) };
}

/* ---------- FORGOT PASSWORD ---------- */
async function forgot(body) {
  const { email } = body;
  if (!email) return { status: 400, data: { error: 'Email required' } };
  const user = await db.one('SELECT id FROM users WHERE email=$1', [email]);
  // don't reveal whether the email exists — always say sent
  if (user) await issueOtp(email, 'reset', user.id);
  return { status: 200, data: { ok: true, message: 'If the email exists, a reset code was sent' } };
}

/* ---------- RESET PASSWORD ---------- */
async function resetPassword(body) {
  const { resetTicket, newPassword } = body;
  const claim = auth.verifyAccess(resetTicket);
  if (!claim || claim.role !== 'reset')
    return { status: 401, data: { error: 'Invalid or expired reset session' } };
  if (!newPassword || newPassword.length < 8)
    return { status: 400, data: { error: 'Password must be at least 8 characters' } };
  const hash = await auth.hashPassword(newPassword);
  const user = await db.one('UPDATE users SET password_hash=$2 WHERE email=$1 RETURNING *',
    [claim.email, hash]);
  if (!user) return { status: 404, data: { error: 'Account not found' } };
  await logActivity(user.id, 'password_reset', null);
  return { status: 200, data: tokenBundle(user) };
}

/* ---------- token bundle ---------- */
function tokenBundle(user) {
  return {
    ok: true,
    accessToken: auth.signAccess(user),
    refreshToken: auth.signRefresh(user),
    user: {
      id: user.id, firstName: user.first_name, lastName: user.last_name,
      email: user.email, role: user.role, company: user.company_name,
    },
  };
}

module.exports = { signup, verifyOtp, login, forgot, resetPassword, issueOtp };
