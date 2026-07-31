export async function GET() {
  return Response.json({ ok: true, service: "LEGASI FINANCE X", apiConfigured: Boolean(process.env.LFX_API_URL), timestamp: new Date().toISOString() });
}
