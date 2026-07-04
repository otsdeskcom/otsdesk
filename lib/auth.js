/**
 * OTS Desk — Authentication core
 * ---------------------------------------------------------------------------
 * Password hashing, JWT access/refresh tokens, OTP generation & verification.
 * All security-sensitive logic lives here in one place.
 * ---------------------------------------------------------------------------
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET     = process.env.JWT_SECRET     || 'dev-only-change-me';
const JWT_REFRESH    = process.env.JWT_REFRESH    || 'dev-only-refresh-me';
const ACCESS_TTL     = '15m';    // short-lived access token
const REFRESH_TTL    = '30d';    // long-lived refresh token
const OTP_TTL_MIN    = 10;       // OTP valid for 10 minutes
const OTP_MAX_TRIES  = 5;

/* ---------- passwords ---------- */
async function hashPassword(plain) {
  if (!plain || plain.length < 8) throw new Error('Password must be at least 8 characters');
  return bcrypt.hash(plain, 12);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/* ---------- JWT ---------- */
function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET, { expiresIn: ACCESS_TTL }
  );
}
function signRefresh(user) {
  return jwt.sign({ sub: user.id }, JWT_REFRESH, { expiresIn: REFRESH_TTL });
}
function verifyAccess(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function verifyRefresh(token) {
  try { return jwt.verify(token, JWT_REFRESH); } catch { return null; }
}

/* ---------- OTP ---------- */
/** generate a 6-digit code + its hash (store the HASH, email the CODE) */
function generateOtp() {
  const code = String(crypto.randomInt(100000, 1000000)); // always 6 digits
  const code_hash = crypto.createHash('sha256').update(code).digest('hex');
  const expires_at = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  return { code, code_hash, expires_at };
}
/** check a submitted code against a stored otp row */
function checkOtp(submitted, otpRow) {
  if (!otpRow) return { ok: false, reason: 'no_code' };
  if (otpRow.consumed) return { ok: false, reason: 'used' };
  if (new Date(otpRow.expires_at) < new Date()) return { ok: false, reason: 'expired' };
  if (otpRow.attempts >= OTP_MAX_TRIES) return { ok: false, reason: 'too_many' };
  const hash = crypto.createHash('sha256').update(String(submitted)).digest('hex');
  if (hash !== otpRow.code_hash) return { ok: false, reason: 'mismatch' };
  return { ok: true };
}

/* ---------- refresh token storage hashing ---------- */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  hashPassword, verifyPassword,
  signAccess, signRefresh, verifyAccess, verifyRefresh,
  generateOtp, checkOtp, hashToken,
  OTP_TTL_MIN,
};
