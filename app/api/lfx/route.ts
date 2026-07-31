import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function config() {
  return { url: process.env.LFX_API_URL || "", key: process.env.LFX_API_KEY || "" };
}

async function readJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error(`LFX Core API returned an invalid response (${response.status}).`); }
}

export async function GET(request: NextRequest) {
  const { url, key } = config();
  if (!url) return NextResponse.json({ ok: false, demo: true, error: "LFX_API_URL is not configured." }, { status: 503 });
  const incoming = request.nextUrl.searchParams;
  const target = new URL(url);
  incoming.forEach((value, name) => target.searchParams.set(name, value));
  if (key) target.searchParams.set("api_key", key);
  try {
    const response = await fetch(target, { cache: "no-store", redirect: "follow" });
    const data = await readJson(response);
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to reach LFX Core API." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const { url, key } = config();
  if (!url) return NextResponse.json({ ok: false, demo: true, error: "LFX_API_URL is not configured." }, { status: 503 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, api_key: key }),
      cache: "no-store",
      redirect: "follow"
    });
    const data = await readJson(response);
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to process LFX request." }, { status: 502 });
  }
}
