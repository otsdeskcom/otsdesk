const H = require('../../../../lib/admin-handlers');
const { requireOwner } = require('../../../../lib/req-owner');
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const g = await requireOwner(req);
  if (g.error) return Response.json({ error: g.error }, { status: g.status });
  const url = new URL(req.url);
  return Response.json({ users: await H.users({ search: url.searchParams.get('search')||'', status: url.searchParams.get('status')||'all', limit: 50, offset: 0 }) });
}
