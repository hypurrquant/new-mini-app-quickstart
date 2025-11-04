import { NextResponse } from "next/server";
import { isAddress, Address } from "viem";
import { publicClient } from "../../../lib/viemClient";
import { AERODROME_PAIR_ABI, ERC20_ABI } from "../../../lib/abis";

type JsonRpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  if (!owner || !isAddress(owner)) {
    return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
  }

  const httpUrl =
    process.env.ALCHEMY_BASE_HTTP ||
    (process.env.ALCHEMY_BASE_KEY
      ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_BASE_KEY}`
      : undefined);

  if (!httpUrl) {
    return NextResponse.json({ error: "Missing ALCHEMY_BASE_HTTP or ALCHEMY_BASE_KEY env" }, { status: 500 });
  }

  try {
    const res = await fetch(httpUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenBalances",
        params: [owner, "erc20"],
      }),
    });

    const json = (await res.json()) as JsonRpcResponse<{ tokenBalances: Array<{ contractAddress: string; tokenBalance: string }> }>;
    if (json.error) {
      return NextResponse.json({ error: json.error.message }, { status: 502 });
    }

    const balances = json.result?.tokenBalances || [];
    const nonZeroContracts = balances
      .filter((b) => b.tokenBalance && b.tokenBalance !== "0x0")
      .map((b) => b.contractAddress as Address);

    // Probe which contracts are Aerodrome pairs (have token0/token1) and user holds LP > 0
    const results: Address[] = [];

    // Limit concurrency to avoid overload
    const concurrency = 8;
    let index = 0;
    async function worker() {
      while (index < nonZeroContracts.length) {
        const i = index++;
        const addr = nonZeroContracts[i];
        try {
          const token0 = await publicClient.readContract({ address: addr, abi: AERODROME_PAIR_ABI, functionName: "token0" });
          if (token0) {
            const lpBal = await publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: "balanceOf", args: [owner as Address] });
            if ((lpBal as bigint) > 0n) {
              results.push(addr);
            }
          }
        } catch (_) {
          // not a pair or read failed; skip
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, nonZeroContracts.length) }, () => worker());
    await Promise.all(workers);

    return NextResponse.json({ pairs: results });
  } catch (e) {
    return NextResponse.json({ error: "Discovery failed" }, { status: 500 });
  }
}


