const { verifyAccess } = require('./auth');
const db = require('./db');
async function requireOwner(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const claim = verifyAccess(token);
  if (!claim) return { error: 'Unauthorized', status: 401 };
  const user = await db.one('SELECT id, role FROM users WHERE id=$1', [claim.sub]);
  if (!user || user.role !== 'owner') return { error: 'Forbidden', status: 403 };
  return { user };
}
module.exports = { requireOwner };
