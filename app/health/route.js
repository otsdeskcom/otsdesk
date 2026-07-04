export async function GET() {
  return Response.json({ status: 'ok', service: 'otsdesk', time: new Date().toISOString() });
}
