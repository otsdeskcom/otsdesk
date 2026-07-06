const H = require('../../../lib/dashboard-handlers');
const { requireUser } = require('../../../lib/req-auth');
export const dynamic = 'force-dynamic';
export async function GET(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const data = await H.summary(user.id, {
    range: url.searchParams.get('range') || 'month',
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
  });
  return Response.json(data);
}
