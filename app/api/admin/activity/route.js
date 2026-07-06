const H = require('../../../../lib/admin-handlers');
const { requireOwner } = require('../../../../lib/req-owner');
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const g = await requireOwner(req);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  return Response.json({ activity: await H.activity({ limit: 40 }) });
}
