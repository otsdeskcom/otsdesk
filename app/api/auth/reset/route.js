const H = require('../../../../lib/auth-handlers');
export const dynamic = 'force-dynamic';
export async function POST(req) {
  const { status, data } = await H.resetPassword(await req.json());
  return Response.json(data, { status });
}
