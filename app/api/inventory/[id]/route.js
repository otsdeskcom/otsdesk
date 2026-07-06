const H = require('../../../../lib/inventory-handlers');
const { requireUser } = require('../../../../lib/req-auth');
export const dynamic = 'force-dynamic';
export async function DELETE(req, { params }) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { status, data } = await H.remove(user, params.id);
  return Response.json(data, { status });
}
