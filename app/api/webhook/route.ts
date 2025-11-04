import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Placeholder webhook handler. Extend as needed.
  const body = await request.text();
  return NextResponse.json({ ok: true, received: body ? true : false });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}


