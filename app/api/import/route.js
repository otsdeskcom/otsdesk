const XLSX = require('xlsx');
const { importRows } = require('../../../lib/import-handlers');
const { requireUser } = require('../../../lib/req-auth');
export const dynamic = 'force-dynamic';
export async function POST(req) {
  const user = await requireUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  const feeActual = form.get('feeActual') !== 'false';
  if (!file) return Response.json({ error: 'No file' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const { status, data } = await importRows(user, rows, { feeActual });
  return Response.json(data, { status });
}
