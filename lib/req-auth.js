/** Shared: resolve the logged-in user from the request's Bearer token. */
const { verifyAccess } = require('./auth');
const db = require('./db');

async function requireUser(req) {
  const hdr = req.headers.get('authorization') || '';
  const token = hdr.replace('Bearer ', '');
  const claim = verifyAccess(token);
  if (!claim) return null;
  return db.one('SELECT * FROM users WHERE id=$1', [claim.sub]);
}
module.exports = { requireUser };
