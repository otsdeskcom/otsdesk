const H = require('../../../lib/settings-handlers');
const { requireUser } = require('../../../lib/req-auth');
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json(await H.get(user.id));
}
export async function PATCH(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { status, data } = await H.update(user.id, await req.json());
  return Response.json(data, { status });
}
