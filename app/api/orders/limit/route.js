const H = require('../../../../lib/orders-handlers');
const { requireUser } = require('../../../../lib/req-auth');
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await H.limit(user));
}
