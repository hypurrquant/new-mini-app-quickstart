import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chain = searchParams.get("chain") || "base";
  const pair = searchParams.get("pair");
  if (!pair) {
    return NextResponse.json({ error: "Missing pair" }, { status: 400 });
  }

  const url = `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chain)}/${encodeURIComponent(pair)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }
}


