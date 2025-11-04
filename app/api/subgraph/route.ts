import { NextRequest, NextResponse } from "next/server";

const AERODROME_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_clvxxqf0uc8qs01x7bcs1e4ci/subgraphs/aerodrome-slipstream/v1.0.0/gn";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * Subgraph API endpoint
 * Fetches data from Aerodrome Subgraph (CL v3 / Slipstream)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, variables } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const response = await fetch(AERODROME_SUBGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: variables || {},
      }),
    });

    if (!response.ok) {
      console.error("Subgraph request failed:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Subgraph request failed", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.errors) {
      console.error("Subgraph query errors:", data.errors);
      return NextResponse.json({ error: "Subgraph query error", details: data.errors }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Subgraph API error:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}

