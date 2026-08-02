export async function GET() {
  return Response.json({ ok: true, service: "Hab Perbendaharaan Digital", apiConfigured: Boolean(process.env.LFX_API_URL), timestamp: new Date().toISOString() });
}
