const H = require('../../../lib/orders-handlers');
const { requireUser } = require('../../../lib/req-auth');
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const orders = await H.list(user.id, {
    month: url.searchParams.get('month') || 'all',
    search: url.searchParams.get('search') || '',
    sort: url.searchParams.get('sort') || 'newest',
  });
  return Response.json({ orders });
}
export async function POST(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { status, data } = await H.create(user, await req.json());
  return Response.json(data, { status });
}
