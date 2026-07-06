const H = require('../../../lib/inventory-handlers');
const { requireUser } = require('../../../lib/req-auth');
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ inventory: await H.list(user.id) });
}
export async function POST(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { status, data } = await H.add(user, await req.json());
  return Response.json(data, { status });
}
