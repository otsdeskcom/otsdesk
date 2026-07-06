const XLSX = require('xlsx');
const { buildExport } = require('../../../lib/export-handlers');
const { requireUser } = require('../../../lib/req-auth');
export const dynamic = 'force-dynamic';
export async function POST(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const opts = await req.json();
  const { rows } = await buildExport(user, opts);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'OTS Desk Export');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="OTSDesk_Export_${new Date().toISOString().slice(0,10)}.xlsx"`,
    },
  });
}
