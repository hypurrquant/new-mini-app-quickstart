import { NextResponse } from "next/server";
import { isAddress, Address } from "viem";
import { publicClient } from "../../../lib/viemClient";
import { NPM_ABI, CL_FACTORY_ABI, CL_POOL_ABI, CL_GAUGE_ABI, ERC20_ABI, SUGAR_HELPER_ABI } from "../../../lib/abis";
import { AERODROME_NPM, AERODROME_CL_FACTORY, SUGAR_HELPER } from "../../../lib/addresses";
import { WHITELIST_POOLS } from "../../../lib/poolWhitelist";

// Enso Finance API for token prices (Base chain)
const ENSO_API_BASE_URL = "https://api.enso.finance/api/v1/prices";
const BASE_CHAIN_ID = 8453;

// Aerodrome Subgraph URL
const AERODROME_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_clvxxqf0uc8qs01x7bcs1e4ci/subgraphs/aerodrome-slipstream/v1.0.0/gn";

async function fetchTokenPricesUSD(tokenAddresses: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  try {
    // Use Enso Finance API for token prices
    // API: GET https://api.enso.finance/api/v1/prices/{chainId}/{address}
    // Reference: https://docs.enso.build/api-reference/tokens/token-price
    
    const pricePromises = tokenAddresses.map(async (address) => {
      try {
        const response = await fetch(
          `${ENSO_API_BASE_URL}/${BASE_CHAIN_ID}/${address}`,
          { 
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 60 } // Cache for 60 seconds
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          // Enso returns price in USD directly
          return { address: address.toLowerCase(), price: data.price || 0 };
        }
        return { address: address.toLowerCase(), price: 0 };
      } catch (e) {
        console.error(`Failed to fetch price for ${address}:`, e);
        return { address: address.toLowerCase(), price: 0 };
      }
    });
    
    const results = await Promise.all(pricePromises);
    results.forEach(({ address, price }) => {
      if (price > 0) {
        prices.set(address, price);
      }
    });
  } catch (error) {
    console.error("Failed to fetch token prices from Enso:", error);
  }

  return prices;
}

/**
 * Fetch Pool data from Subgraph
 * Returns: TVL, Volume (24h, 7d), Fees (24h, 7d), Fee APR
 */
async function fetchPoolDataFromSubgraph(poolAddresses: string[]): Promise<Map<string, any>> {
  const poolData = new Map<string, any>();
  
  if (poolAddresses.length === 0) return poolData;
  
  try {
    const poolIds = poolAddresses.map((addr) => addr.toLowerCase());
    
    const query = `
      query GetPoolData($poolIds: [String!]!) {
        pools(where: { id_in: $poolIds }) {
          id
          totalValueLockedUSD
          volumeUSD
          feesUSD
          token0 {
            id
            symbol
          }
          token1 {
            id
            symbol
          }
          poolDayData(first: 7, orderBy: date, orderDirection: desc) {
            date
            volumeUSD
            feesUSD
            tvlUSD
          }
        }
      }
    `;
    
    const response = await fetch(AERODROME_SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { poolIds } }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!response.ok) {
      console.error("Subgraph request failed:", response.status);
      return poolData;
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("Subgraph query errors:", result.errors);
      return poolData;
    }
    
    const pools = result.data?.pools || [];
    
    for (const pool of pools) {
      const dayData = pool.poolDayData || [];
      
      // Calculate 24h and 7d metrics
      const volume24h = dayData.length > 0 ? parseFloat(dayData[0].volumeUSD || "0") : 0;
      const fees24h = dayData.length > 0 ? parseFloat(dayData[0].feesUSD || "0") : 0;
      
      const volume7d = dayData.reduce((sum: number, d: any) => sum + parseFloat(d.volumeUSD || "0"), 0);
      const fees7d = dayData.reduce((sum: number, d: any) => sum + parseFloat(d.feesUSD || "0"), 0);
      
      const tvl = parseFloat(pool.totalValueLockedUSD || "0");
      
      // Calculate Fee-based APR (annualized from 7d average)
      const avgDailyFees = fees7d / 7;
      const feeAPR = tvl > 0 ? (avgDailyFees * 365 / tvl) * 100 : 0;
      
      poolData.set(pool.id.toLowerCase(), {
        tvl: tvl.toFixed(2),
        volume24h: volume24h.toFixed(2),
        volume7d: volume7d.toFixed(2),
        fees24h: fees24h.toFixed(2),
        fees7d: fees7d.toFixed(2),
        feeAPR: feeAPR.toFixed(2) + "%",
      });
    }
  } catch (error) {
    console.error("Failed to fetch pool data from Subgraph:", error);
  }
  
  return poolData;
}

/**
 * Fetch Position data from Subgraph
 * Returns: Collected Fees, Position Age, Deposit amount
 */
async function fetchPositionDataFromSubgraph(tokenIds: string[]): Promise<Map<string, any>> {
  const positionData = new Map<string, any>();
  
  if (tokenIds.length === 0) return positionData;
  
  try {
    const query = `
      query GetPositions($tokenIds: [String!]!) {
        positions(where: { id_in: $tokenIds }) {
          id
          liquidity
          depositedToken0
          depositedToken1
          withdrawnToken0
          withdrawnToken1
          collectedFeesToken0
          collectedFeesToken1
          transaction {
            timestamp
          }
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
        }
      }
    `;
    
    const response = await fetch(AERODROME_SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { tokenIds } }),
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!response.ok) {
      console.error("Subgraph position request failed:", response.status);
      return positionData;
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("Subgraph position query errors:", result.errors);
      return positionData;
    }
    
    const positions = result.data?.positions || [];
    
    for (const pos of positions) {
      const createdAt = pos.transaction?.timestamp ? parseInt(pos.transaction.timestamp) : 0;
      const ageInDays = createdAt > 0 ? Math.floor((Date.now() / 1000 - createdAt) / 86400) : 0;
      
      const token0Decimals = parseInt(pos.token0?.decimals || "18");
      const token1Decimals = parseInt(pos.token1?.decimals || "18");
      
      const collectedFees0 = parseFloat(pos.collectedFeesToken0 || "0") / Math.pow(10, token0Decimals);
      const collectedFees1 = parseFloat(pos.collectedFeesToken1 || "0") / Math.pow(10, token1Decimals);
      
      const depositedToken0 = parseFloat(pos.depositedToken0 || "0") / Math.pow(10, token0Decimals);
      const depositedToken1 = parseFloat(pos.depositedToken1 || "0") / Math.pow(10, token1Decimals);
      
      positionData.set(pos.id.toLowerCase(), {
        createdAt,
        ageInDays,
        collectedFees0: collectedFees0.toFixed(6),
        collectedFees1: collectedFees1.toFixed(6),
        collectedFees0Symbol: pos.token0?.symbol || "?",
        collectedFees1Symbol: pos.token1?.symbol || "?",
        depositedToken0: depositedToken0.toFixed(6),
        depositedToken1: depositedToken1.toFixed(6),
      });
    }
  } catch (error) {
    console.error("Failed to fetch position data from Subgraph:", error);
  }
  
  return positionData;
}

type AlchemyNft = {
  id?: { tokenId?: string };
};

async function fetchAllNfts(owner: string, apiKey: string) {
  const out: string[] = [];
  let pageKey: string | undefined = undefined;
  do {
    const url = new URL(`https://base-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTs`);
    url.searchParams.set("owner", owner);
    url.searchParams.append("contractAddresses[]", AERODROME_NPM);
    url.searchParams.set("withMetadata", "false");
    url.searchParams.set("pageSize", "100");
    if (pageKey) url.searchParams.set("pageKey", pageKey);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = await res.json();
    const nfts: AlchemyNft[] = json?.ownedNfts || json?.nfts || [];
    for (const nft of nfts) {
      const tid = nft?.id?.tokenId;
      if (typeof tid === "string") out.push(tid);
    }
    pageKey = json?.pageKey;
  } while (pageKey);
  return out;
}

function hexToBigIntId(tokenIdHex: string): bigint {
  try {
    return BigInt(tokenIdHex);
  } catch {
    if (tokenIdHex.startsWith("0x")) return BigInt(tokenIdHex);
    return BigInt(`0x${tokenIdHex}`);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const debugFlag = searchParams.get("debug");
  const debug: any = { owner, steps: [] };
  if (!owner || !isAddress(owner)) {
    return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
  }

  try {
    // 1) Get NFTs directly held in wallet
    let walletTokenIds: bigint[] = [];
    try {
      const balance = await publicClient.readContract({
        address: AERODROME_NPM,
        abi: NPM_ABI,
        functionName: "balanceOf",
        args: [owner as Address],
      });
      const count = Number(balance as bigint);
      debug.steps.push({ step: "wallet.balanceOf", count });
      if (count > 0) {
        const indexCalls = Array.from({ length: count }, (_, i) => ({
          address: AERODROME_NPM as Address,
          abi: NPM_ABI,
          functionName: "tokenOfOwnerByIndex" as const,
          args: [owner as Address, BigInt(i)],
        }));
        const idxResults = await publicClient.multicall({ contracts: indexCalls, allowFailure: true });
        walletTokenIds = idxResults
          .filter((r) => r.status === "success")
          .map((r) => r.result as bigint);
        debug.steps.push({ step: "wallet.tokenIds", count: walletTokenIds.length, tokenIds: debugFlag ? walletTokenIds.map(String) : undefined });
      }
    } catch (e) {
      debug.steps.push({ step: "wallet.error", error: String(e) });
    }

    // 2) Get staked NFTs from gauges (whitelist pools + cache)
    let stakedTokenIds: bigint[] = [];
    try {
      // Start with whitelist pools
      let poolKeys = WHITELIST_POOLS.map((pk) => ({
        token0: pk.token0 as Address,
        token1: pk.token1 as Address,
        tickSpacing: pk.tickSpacing,
      }));

      // Try loading dynamic cache
      try {
        let cache = null;
        if (typeof window === 'undefined') {
          try {
            const fs = await import('fs');
            const path = await import('path');
            const cachePath = path.join(process.cwd(), 'public', 'pool-cache.json');
            if (fs.existsSync(cachePath)) {
              const cacheData = fs.readFileSync(cachePath, 'utf-8');
              cache = JSON.parse(cacheData);
            }
          } catch {}
        }
        
        if (!cache) {
          const cacheUrl = `${process.env.NEXT_PUBLIC_ROOT_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/pool-cache.json`;
          const cacheRes = await fetch(cacheUrl, { cache: 'no-store' });
          if (cacheRes.ok) {
            cache = await cacheRes.json();
          }
        }

        if (cache) {
          const cachePools = (cache?.pools || []).slice(0, 100);
          for (const cp of cachePools) {
            poolKeys.push({ token0: cp.token0 as Address, token1: cp.token1 as Address, tickSpacing: cp.tickSpacing });
          }
        }
      } catch {}

      // Deduplicate
      const uniqueKeys = Array.from(
        new Map(
          poolKeys.map((k) => [`${k.token0.toLowerCase()}-${k.token1.toLowerCase()}-${k.tickSpacing}`, k])
        ).values()
      );

      debug.steps.push({ step: "gauge.poolKeys", count: uniqueKeys.length });

      // Get pool addresses
      const poolCalls = uniqueKeys.map((k) => ({
        address: AERODROME_CL_FACTORY as Address,
        abi: CL_FACTORY_ABI,
        functionName: "getPool" as const,
        args: [k.token0, k.token1, k.tickSpacing],
      }));
      const poolResults = await publicClient.multicall({ contracts: poolCalls, allowFailure: true });
      const pools = poolResults
        .map((r) => (r.status === "success" && r.result !== "0x0000000000000000000000000000000000000000" ? (r.result as Address) : null))
        .filter(Boolean) as Address[];

      debug.steps.push({ step: "gauge.pools", count: pools.length });

      if (pools.length > 0) {
        // Get gauge addresses
        const gaugeCalls = pools.map((p) => ({
          address: p,
          abi: CL_POOL_ABI,
          functionName: "gauge" as const,
          args: [],
        }));
        const gaugeResults = await publicClient.multicall({ contracts: gaugeCalls, allowFailure: true });
        
        if (debugFlag) {
          debug.steps.push({ 
            step: "gauge.raw", 
            results: gaugeResults.map((r, i) => ({ 
              pool: pools[i], 
              status: r.status, 
              result: r.status === "success" ? r.result : r.error 
            }))
          });
        }
        
        const gauges = gaugeResults
          .map((r) => (r.status === "success" && r.result && r.result !== "0x0000000000000000000000000000000000000000" ? (r.result as Address) : null))
          .filter(Boolean) as Address[];

        debug.steps.push({ step: "gauge.addresses", count: gauges.length });

        if (gauges.length > 0) {
          // Get staked NFTs from each gauge
          const stakedCalls = gauges.map((g) => ({
            address: g,
            abi: CL_GAUGE_ABI,
            functionName: "stakedValues" as const,
            args: [owner as Address],
          }));
          const stakedResults = await publicClient.multicall({ contracts: stakedCalls, allowFailure: true });
          for (const sr of stakedResults) {
            if (sr.status === "success") {
              const ids = sr.result as bigint[];
              stakedTokenIds.push(...ids);
            }
          }
          debug.steps.push({ step: "gauge.stakedNFTs", count: stakedTokenIds.length, tokenIds: debugFlag ? stakedTokenIds.map(String) : undefined });
        }
      }
    } catch (e) {
      debug.steps.push({ step: "gauge.error", error: String(e) });
    }

    // 3) Merge wallet + staked NFTs
    const allTokenIds = Array.from(new Set([...walletTokenIds, ...stakedTokenIds]));
    const stakedSet = new Set(stakedTokenIds.map(id => id.toString()));
    
    debug.steps.push({ step: "total.tokenIds", wallet: walletTokenIds.length, staked: stakedTokenIds.length, total: allTokenIds.length });
    if (allTokenIds.length === 0) {
      return NextResponse.json({ positions: [], debug });
    }

    // Multicall positions
    const positionCalls = allTokenIds.map((id) => ({
      address: AERODROME_NPM as Address,
      abi: NPM_ABI,
      functionName: "positions" as const,
      args: [id],
    }));

    const positionResults = await publicClient.multicall({ contracts: positionCalls, allowFailure: true });
    if (debugFlag) debug.steps.push({ step: "positions.multicall", total: positionCalls.length, ok: positionResults.filter((r) => r.status === 'success').length });

    type PositionOut = {
      tokenId: string;
      token0: Address;
      token1: Address;
      tickSpacing: number;
      tickLower: number;
      tickUpper: number;
      liquidity: string;
      liquidityRaw?: string;
      isActive?: boolean;
      isStaked?: boolean;
      pool: Address | null;
      slot0?: { sqrtPriceX96: string; tick: number };
      poolLiquidity?: string;
    };

    const positions: PositionOut[] = [];
    const poolKeyList: Array<{ token0: Address; token1: Address; tickSpacing: number } | null> = [];

    for (let i = 0; i < positionResults.length; i++) {
      const r = positionResults[i];
      if (r.status !== "success") {
        poolKeyList.push(null);
        continue;
      }
      const [_nonce, _operator, token0, token1, tickSpacing, tickLower, tickUpper, liquidity] = r.result;
      const liquidityBig = liquidity;
      const isStaked = stakedSet.has(allTokenIds[i].toString());
      positions.push({
        tokenId: allTokenIds[i].toString(),
        token0: token0 as Address,
        token1: token1 as Address,
        tickSpacing: Number(tickSpacing),
        tickLower: Number(tickLower),
        tickUpper: Number(tickUpper),
        liquidity: liquidityBig.toString(),
        liquidityRaw: liquidityBig.toString(),
        isActive: liquidityBig > 0n || isStaked,
        isStaked,
        pool: null,
      });
      poolKeyList.push({ token0: token0 as Address, token1: token1 as Address, tickSpacing: Number(tickSpacing) });
    }

    // Resolve pool addresses via factory.getPool
    const getPoolCalls = poolKeyList
      .map((k) =>
        k
          ? ({ address: AERODROME_CL_FACTORY as Address, abi: CL_FACTORY_ABI, functionName: "getPool" as const, args: [k.token0, k.token1, k.tickSpacing] } as const)
          : null
      )
      .filter(Boolean) as any[];

    const getPoolResults = getPoolCalls.length
      ? await publicClient.multicall({ contracts: getPoolCalls, allowFailure: true })
      : [];
    if (debugFlag) debug.steps.push({ step: "getPool.multicall", total: getPoolCalls.length, ok: getPoolResults.filter((r) => r.status === 'success').length });

    let gi = 0;
    for (let i = 0; i < positions.length; i++) {
      const k = poolKeyList[i];
      if (!k) continue;
      const rr = getPoolResults[gi++];
      if (rr && rr.status === "success") {
        positions[i].pool = rr.result as Address;
      }
    }

    // Fetch slot0/liquidity for unique pools
    const uniquePools = Array.from(new Set(positions.map((p) => p.pool).filter(Boolean))) as Address[];
    if (uniquePools.length > 0) {
      const poolCalls = uniquePools.flatMap((pool) => [
        { address: pool, abi: CL_POOL_ABI, functionName: "slot0" as const, args: [] },
        { address: pool, abi: CL_POOL_ABI, functionName: "liquidity" as const, args: [] },
      ]);
      const poolResults = await publicClient.multicall({ contracts: poolCalls, allowFailure: true });
      if (debugFlag) debug.steps.push({ step: "pool.slot0+liquidity.multicall", total: poolCalls.length, ok: poolResults.filter((r) => r.status === 'success').length });
      for (let i = 0; i < uniquePools.length; i++) {
        const pool = uniquePools[i];
        const slot0Res = poolResults[i * 2 + 0];
        const liqRes = poolResults[i * 2 + 1];
        const slot0 = slot0Res.status === "success" ? slot0Res.result as readonly [bigint, number, number, number, number, boolean] : undefined;
        const poolLiq = liqRes.status === "success" ? (liqRes.result as bigint) : undefined;
        for (const p of positions) {
          if (p.pool === pool) {
            if (slot0) p.slot0 = { sqrtPriceX96: slot0[0].toString(), tick: Number(slot0[1]) };
            if (poolLiq !== undefined) p.poolLiquidity = poolLiq.toString();
          }
        }
      }
    }

    // Enrich token symbols/decimals and derive pair name
    const uniqueTokens = Array.from(
      new Set(positions.flatMap((p) => [p.token0, p.token1]))
    ) as Address[];
    let tokenInfo: Map<string, { symbol?: string; decimals?: number }> = new Map();
    if (uniqueTokens.length > 0) {
      const tokenCalls = uniqueTokens.flatMap((addr) => [
        { address: addr, abi: ERC20_ABI, functionName: "symbol" as const, args: [] },
        { address: addr, abi: ERC20_ABI, functionName: "decimals" as const, args: [] },
      ]);
      const tokenResults = await publicClient.multicall({ contracts: tokenCalls, allowFailure: true });
      if (debugFlag) debug.steps.push({ step: "erc20.symbol+decimals.multicall", total: tokenCalls.length, ok: tokenResults.filter((r) => r.status === 'success').length });
      tokenInfo = new Map<string, { symbol?: string; decimals?: number }>();
      for (let i = 0; i < uniqueTokens.length; i++) {
        const symRes = tokenResults[i * 2 + 0];
        const decRes = tokenResults[i * 2 + 1];
        tokenInfo.set(uniqueTokens[i].toLowerCase(), {
          symbol: symRes.status === "success" ? (symRes.result as string) : undefined,
          decimals: decRes.status === "success" ? Number(decRes.result as bigint) : undefined,
        });
      }
      (positions as any[]).forEach((p) => {
        const t0 = tokenInfo.get((p.token0 as string).toLowerCase());
        const t1 = tokenInfo.get((p.token1 as string).toLowerCase());
        (p as any).token0Symbol = t0?.symbol;
        (p as any).token1Symbol = t1?.symbol;
        (p as any).token0Decimals = t0?.decimals;
        (p as any).token1Decimals = t1?.decimals;
        (p as any).pairSymbol = t0?.symbol && t1?.symbol ? `${t0.symbol}/${t1.symbol}` : undefined;
      });
    }

    // Derive current price from tick and decimals + estimate token amounts
    // STEP 1: Use SugarHelper for accurate calculations
    if (positions.length > 0) {
      const helperCalls = positions.flatMap((p: any) => [
        {
          address: SUGAR_HELPER as Address,
          abi: SUGAR_HELPER_ABI,
          functionName: "principal" as const,
          args: [
            AERODROME_NPM as Address,
            BigInt(p.tokenId),
            p.slot0?.sqrtPriceX96 ? BigInt(p.slot0.sqrtPriceX96) : 0n
          ],
        },
        {
          address: SUGAR_HELPER as Address,
          abi: SUGAR_HELPER_ABI,
          functionName: "fees" as const,
          args: [AERODROME_NPM as Address, BigInt(p.tokenId)],
        },
      ]);

      try {
        const helperResults = await publicClient.multicall({
          contracts: helperCalls,
          allowFailure: true,
        });

        for (let i = 0; i < positions.length; i++) {
          const p = positions[i] as any;
          const principalRes = helperResults[i * 2];
          const feesRes = helperResults[i * 2 + 1];
          const d0 = p.token0Decimals || 18;
          const d1 = p.token1Decimals || 18;

          // Use SugarHelper principal() for more accurate token amounts
          if (principalRes.status === "success" && principalRes.result) {
            const [amt0, amt1] = principalRes.result as [bigint, bigint];
            p.estimatedAmount0 = Number(amt0) / Math.pow(10, d0);
            p.estimatedAmount1 = Number(amt1) / Math.pow(10, d1);
            p.calculatedBy = "SugarHelper";
          }

          // Use SugarHelper fees() for unclaimed fees
          if (feesRes.status === "success" && feesRes.result) {
            const [fee0, fee1] = feesRes.result as [bigint, bigint];
            const fees0Amount = Number(fee0) / Math.pow(10, d0);
            const fees1Amount = Number(fee1) / Math.pow(10, d1);
            p.unclaimedFees0 = fees0Amount > 0 ? fees0Amount.toFixed(6) : "0";
            p.unclaimedFees1 = fees1Amount > 0 ? fees1Amount.toFixed(6) : "0";
            p.unclaimedFees0Symbol = p.token0Symbol;
            p.unclaimedFees1Symbol = p.token1Symbol;
          }
        }

        if (debugFlag) debug.steps.push({ step: "sugarHelper", success: positions.filter((p: any) => p.calculatedBy === "SugarHelper").length });
      } catch (error) {
        console.error("SugarHelper failed, will use manual calculation:", error);
        if (debugFlag) debug.steps.push({ step: "sugarHelper", error: "failed" });
      }
    }

    // STEP 2: Calculate prices and fallback for positions without SugarHelper data
    for (const p of positions as any[]) {
      const tick = p?.slot0?.tick as number | undefined;
      const d0 = (p as any).token0Decimals ?? tokenInfo.get((p.token0 as string).toLowerCase())?.decimals ?? 18;
      const d1 = (p as any).token1Decimals ?? tokenInfo.get((p.token1 as string).toLowerCase())?.decimals ?? 18;
      const liquidity = BigInt(p.liquidity || "0");

      if (typeof tick === "number" && liquidity > 0n) {
        const ratio = Math.pow(1.0001, tick); // price of token1 in token0, ignoring decimals
        const scale = Math.pow(10, d0 - d1);
        const price1Per0 = ratio * scale;
        const price0Per1 = price1Per0 !== 0 ? 1 / price1Per0 : undefined;
        (p as any).price1Per0 = price1Per0 ? Number(price1Per0.toFixed(8)) : undefined;
        (p as any).price0Per1 = price0Per1 ? Number(price0Per1.toFixed(8)) : undefined;

        // Compute user's selected price range in both directions
        const rMin = Math.pow(1.0001, p.tickLower) * scale;
        const rMax = Math.pow(1.0001, p.tickUpper) * scale;
        const min1Per0 = Math.min(rMin, rMax);
        const max1Per0 = Math.max(rMin, rMax);
        (p as any).priceRange1Per0Min = Number(min1Per0.toFixed(8));
        (p as any).priceRange1Per0Max = Number(max1Per0.toFixed(8));
        const min0Per1 = min1Per0 !== 0 ? 1 / max1Per0 : undefined;
        const max0Per1 = max1Per0 !== 0 ? 1 / min1Per0 : undefined;
        (p as any).priceRange0Per1Min = min0Per1 ? Number(min0Per1.toFixed(8)) : undefined;
        (p as any).priceRange0Per1Max = max0Per1 ? Number(max0Per1.toFixed(8)) : undefined;

        // Only calculate token amounts if SugarHelper didn't provide them
        if (!p.calculatedBy) {
          // Estimate token amounts from liquidity (simplified formula)
          const sqrtPriceX96Current = p.slot0?.sqrtPriceX96 ? BigInt(p.slot0.sqrtPriceX96) : 0n;
          const sqrtPriceCurrent = Number(sqrtPriceX96Current) / (2 ** 96);
          
          const sqrtPriceLower = Math.sqrt(Math.pow(1.0001, p.tickLower));
          const sqrtPriceUpper = Math.sqrt(Math.pow(1.0001, p.tickUpper));
          
          const L = Number(liquidity);
          let amount0Raw = 0;
          let amount1Raw = 0;

          if (tick < p.tickLower) {
            // Position is all in token0
            amount0Raw = L * (1 / sqrtPriceLower - 1 / sqrtPriceUpper);
          } else if (tick >= p.tickUpper) {
            // Position is all in token1
            amount1Raw = L * (sqrtPriceUpper - sqrtPriceLower);
          } else {
            // Position is in both tokens
            amount0Raw = L * (1 / sqrtPriceCurrent - 1 / sqrtPriceUpper);
            amount1Raw = L * (sqrtPriceCurrent - sqrtPriceLower);
          }

          // Convert to human-readable amounts
          const amount0 = amount0Raw / Math.pow(10, d0);
          const amount1 = amount1Raw / Math.pow(10, d1);

          (p as any).estimatedAmount0 = amount0 > 0 ? Number(amount0.toFixed(6)) : 0;
          (p as any).estimatedAmount1 = amount1 > 0 ? Number(amount1.toFixed(6)) : 0;
          p.calculatedBy = "Manual";
        }
      }
    }

    // Fetch USD prices for all tokens
    const allTokenAddresses = Array.from(new Set(positions.flatMap((p) => [p.token0, p.token1]))) as string[];
    const tokenPricesUSD = await fetchTokenPricesUSD(allTokenAddresses);
    
    // Calculate USD values for positions
    for (const p of positions as any[]) {
      const price0 = tokenPricesUSD.get((p.token0 as string).toLowerCase()) || 0;
      const price1 = tokenPricesUSD.get((p.token1 as string).toLowerCase()) || 0;
      
      const amount0 = p.estimatedAmount0 || 0;
      const amount1 = p.estimatedAmount1 || 0;
      
      const usdValue0 = amount0 * price0;
      const usdValue1 = amount1 * price1;
      const totalUSD = usdValue0 + usdValue1;
      
      p.token0PriceUSD = price0 > 0 ? price0.toFixed(4) : undefined;
      p.token1PriceUSD = price1 > 0 ? price1.toFixed(4) : undefined;
      p.estimatedValueUSD = totalUSD > 0 ? totalUSD.toFixed(2) : undefined;
      
      // Calculate USD value of unclaimed fees (from SugarHelper)
      if (p.unclaimedFees0 && p.unclaimedFees1) {
        const fees0 = parseFloat(p.unclaimedFees0) || 0;
        const fees1 = parseFloat(p.unclaimedFees1) || 0;
        const feesUSD = fees0 * price0 + fees1 * price1;
        p.unclaimedFeesUSD = feesUSD > 0 ? feesUSD.toFixed(2) : "0";
      }
    }

    // Fetch Gauge reward info for staked positions
    const stakedPositions = (positions as any[]).filter((p) => p.isStaked && p.pool);
    if (stakedPositions.length > 0) {
      // Get gauge addresses for staked positions' pools
      const stakedPools = Array.from(new Set(stakedPositions.map((p) => p.pool))) as Address[];
      const gaugeAddressCalls = stakedPools.map((pool) => ({
        address: pool,
        abi: CL_POOL_ABI,
        functionName: "gauge" as const,
        args: [],
      }));
      const gaugeAddressResults = await publicClient.multicall({ contracts: gaugeAddressCalls, allowFailure: true });
      
      const poolToGauge = new Map<string, Address>();
      for (let i = 0; i < stakedPools.length; i++) {
        const res = gaugeAddressResults[i];
        if (res.status === "success" && res.result && res.result !== "0x0000000000000000000000000000000000000000") {
          poolToGauge.set(stakedPools[i].toLowerCase(), res.result as Address);
        }
      }

      // Get gauge info (rewardRate, rewardToken, periodFinish) for each gauge
      const gauges = Array.from(poolToGauge.values());
      if (gauges.length > 0) {
        const gaugeInfoCalls = gauges.flatMap((gauge) => [
          { address: gauge, abi: CL_GAUGE_ABI, functionName: "rewardRate" as const, args: [] },
          { address: gauge, abi: CL_GAUGE_ABI, functionName: "rewardToken" as const, args: [] },
          { address: gauge, abi: CL_GAUGE_ABI, functionName: "periodFinish" as const, args: [] },
        ]);
        
        // Get stakedLiquidity for each pool to calculate proportion
        const stakedLiquidityCalls = stakedPools.map((pool) => ({
          address: pool,
          abi: CL_POOL_ABI,
          functionName: "stakedLiquidity" as const,
          args: [],
        }));
        
        // Get earned amounts for each staked position
        const earnedCalls = stakedPositions.map((p) => {
          const gaugeAddr = poolToGauge.get((p.pool as string).toLowerCase());
          return {
            address: gaugeAddr as Address,
            abi: CL_GAUGE_ABI,
            functionName: "earned" as const,
            args: [owner, BigInt(p.tokenId)],
          };
        });
        
        const [gaugeInfoResults, stakedLiquidityResults, earnedResults] = await Promise.all([
          publicClient.multicall({ contracts: gaugeInfoCalls, allowFailure: true }),
          publicClient.multicall({ contracts: stakedLiquidityCalls, allowFailure: true }),
          publicClient.multicall({ contracts: earnedCalls, allowFailure: true }),
        ]);
        
        const gaugeInfo = new Map<string, { rewardRate?: bigint; rewardToken?: Address; periodFinish?: bigint }>();
        for (let i = 0; i < gauges.length; i++) {
          const rateRes = gaugeInfoResults[i * 3 + 0];
          const tokenRes = gaugeInfoResults[i * 3 + 1];
          const finishRes = gaugeInfoResults[i * 3 + 2];
          gaugeInfo.set(gauges[i].toLowerCase(), {
            rewardRate: rateRes.status === "success" ? (rateRes.result as bigint) : undefined,
            rewardToken: tokenRes.status === "success" ? (tokenRes.result as Address) : undefined,
            periodFinish: finishRes.status === "success" ? (finishRes.result as bigint) : undefined,
          });
        }
        
        // Store stakedLiquidity for each pool
        const poolStakedLiquidity = new Map<string, bigint>();
        for (let i = 0; i < stakedPools.length; i++) {
          const res = stakedLiquidityResults[i];
          if (res.status === "success" && res.result) {
            poolStakedLiquidity.set(stakedPools[i].toLowerCase(), res.result as bigint);
          }
        }

        // Get reward token decimals/symbols
        const rewardTokens = Array.from(new Set(Array.from(gaugeInfo.values()).map((g) => g.rewardToken).filter(Boolean))) as Address[];
        const rewardTokenInfoCalls = rewardTokens.flatMap((token) => [
          { address: token, abi: ERC20_ABI, functionName: "symbol" as const, args: [] },
          { address: token, abi: ERC20_ABI, functionName: "decimals" as const, args: [] },
        ]);
        const rewardTokenInfoResults = await publicClient.multicall({ contracts: rewardTokenInfoCalls, allowFailure: true });
        
        const rewardTokenInfo = new Map<string, { symbol?: string; decimals?: number }>();
        for (let i = 0; i < rewardTokens.length; i++) {
          const symRes = rewardTokenInfoResults[i * 2 + 0];
          const decRes = rewardTokenInfoResults[i * 2 + 1];
          rewardTokenInfo.set(rewardTokens[i].toLowerCase(), {
            symbol: symRes.status === "success" ? (symRes.result as string) : undefined,
            decimals: decRes.status === "success" ? Number(decRes.result as bigint) : undefined,
          });
        }

        // Get reward token prices
        const rewardTokenAddresses = Array.from(new Set(rewardTokens.map((t) => t.toLowerCase())));
        const rewardTokenPricesUSD = await fetchTokenPricesUSD(rewardTokenAddresses);

        // Calculate APR and attach to positions
        for (let idx = 0; idx < stakedPositions.length; idx++) {
          const p = stakedPositions[idx];
          const poolAddr = (p.pool as string).toLowerCase();
          const gauge = poolToGauge.get(poolAddr);
          if (!gauge) continue;
          
          const gInfo = gaugeInfo.get(gauge.toLowerCase());
          if (!gInfo || !gInfo.rewardRate || !gInfo.rewardToken) continue;

          const rewardRate = gInfo.rewardRate;
          const rewardTokenAddr = gInfo.rewardToken;
          const rtInfo = rewardTokenInfo.get(rewardTokenAddr.toLowerCase());
          const rewardDecimals = rtInfo?.decimals ?? 18;
          const rewardSymbol = rtInfo?.symbol ?? "?";

          // Pool-wide reward rate (per second)
          const poolRewardPerSecond = Number(rewardRate) / Math.pow(10, rewardDecimals);
          
          // Calculate my position's share based on liquidity proportion
          const totalStakedLiq = poolStakedLiquidity.get(poolAddr);
          const myLiquidity = BigInt(p.liquidity || "0");
          
          let myRewardPerSecond = 0;
          let liquidityProportion = 0;
          
          if (totalStakedLiq && totalStakedLiq > 0n && myLiquidity > 0n) {
            liquidityProportion = Number(myLiquidity) / Number(totalStakedLiq);
            myRewardPerSecond = poolRewardPerSecond * liquidityProportion;
          }
          
          const myRewardPerDay = myRewardPerSecond * 86400;
          const myRewardPerWeek = myRewardPerSecond * 604800;
          const myRewardPerYear = myRewardPerSecond * 31536000;

          // Store my position's rewards
          (p as any).rewardRate = myRewardPerSecond.toFixed(6);
          (p as any).rewardSymbol = rewardSymbol;
          (p as any).rewardPerDay = myRewardPerDay.toFixed(2);
          (p as any).rewardPerWeek = myRewardPerWeek.toFixed(2);
          
          // Store pool-wide reward info for display
          (p as any).poolRewardRate = poolRewardPerSecond.toFixed(6);
          (p as any).poolRewardSymbol = rewardSymbol;
          (p as any).poolTotalStakedLiquidity = totalStakedLiq ? totalStakedLiq.toString() : "0";
          (p as any).myLiquidityProportion = liquidityProportion > 0 ? (liquidityProportion * 100).toFixed(4) + "%" : "0%";

          // Get actual earned rewards
          const earnedRes = earnedResults[idx];
          if (earnedRes.status === "success" && earnedRes.result) {
            const earnedAmount = Number(earnedRes.result as bigint) / Math.pow(10, rewardDecimals);
            (p as any).earnedAmount = earnedAmount.toFixed(6);
            (p as any).earnedSymbol = rewardSymbol;
          }

          // Calculate APR using USD prices
          const rewardPriceUSD = rewardTokenPricesUSD.get(rewardTokenAddr.toLowerCase()) || 0;
          const positionValueUSD = parseFloat(p.estimatedValueUSD || "0");
          
          (p as any).poolRewardPriceUSD = rewardPriceUSD.toFixed(4);
          
          if (rewardPriceUSD > 0 && positionValueUSD > 0) {
            // APR based on MY rewards, not pool rewards
            const myRewardValuePerYearUSD = myRewardPerYear * rewardPriceUSD;
            const apr = (myRewardValuePerYearUSD / positionValueUSD) * 100;
            (p as any).estimatedAPR = apr > 0 ? apr.toFixed(2) + "%" : undefined;
            (p as any).rewardPerYearUSD = myRewardValuePerYearUSD.toFixed(2);
            
            // Calculate USD value of earned rewards
            const earnedAmount = parseFloat((p as any).earnedAmount || "0");
            if (earnedAmount > 0) {
              (p as any).earnedAmountUSD = (earnedAmount * rewardPriceUSD).toFixed(2);
            }
          }
        }

        if (debugFlag) debug.steps.push({ step: "gauge.rewards", gauges: gauges.length });
      }
    }

    // Phase 1 & 2: Fetch Subgraph data for pools and positions
    if (positions.length > 0) {
      const poolAddresses = Array.from(new Set(positions.map((p: any) => p.pool).filter(Boolean)));
      const tokenIds = positions.map((p: any) => p.tokenId);
      
      const [poolDataMap, positionDataMap] = await Promise.all([
        fetchPoolDataFromSubgraph(poolAddresses),
        fetchPositionDataFromSubgraph(tokenIds),
      ]);
      
      // Attach pool data to positions
      for (const p of positions) {
        const poolAddr = (p.pool as string)?.toLowerCase();
        if (poolAddr && poolDataMap.has(poolAddr)) {
          const poolData = poolDataMap.get(poolAddr);
          (p as any).poolTVL = poolData.tvl;
          (p as any).poolVolume24h = poolData.volume24h;
          (p as any).poolVolume7d = poolData.volume7d;
          (p as any).poolFees24h = poolData.fees24h;
          (p as any).poolFees7d = poolData.fees7d;
          (p as any).poolFeeAPR = poolData.feeAPR;
        }
        
        // Attach position data
        const tokenId = (p.tokenId as string)?.toLowerCase();
        if (tokenId && positionDataMap.has(tokenId)) {
          const posData = positionDataMap.get(tokenId);
          (p as any).positionAge = posData.ageInDays;
          (p as any).positionCreatedAt = posData.createdAt;
          (p as any).collectedFees0 = posData.collectedFees0;
          (p as any).collectedFees1 = posData.collectedFees1;
          (p as any).collectedFees0Symbol = posData.collectedFees0Symbol;
          (p as any).collectedFees1Symbol = posData.collectedFees1Symbol;
          (p as any).depositedToken0 = posData.depositedToken0;
          (p as any).depositedToken1 = posData.depositedToken1;
          
          // Calculate ROI (collected fees vs deposited amount)
          const token0PriceUSD = parseFloat((p as any).token0PriceUSD || "0");
          const token1PriceUSD = parseFloat((p as any).token1PriceUSD || "0");
          
          const collectedValueUSD = 
            parseFloat(posData.collectedFees0) * token0PriceUSD +
            parseFloat(posData.collectedFees1) * token1PriceUSD;
          
          const depositedValueUSD =
            parseFloat(posData.depositedToken0) * token0PriceUSD +
            parseFloat(posData.depositedToken1) * token1PriceUSD;
          
          if (depositedValueUSD > 0) {
            const roi = (collectedValueUSD / depositedValueUSD) * 100;
            (p as any).roi = roi.toFixed(2) + "%";
            (p as any).collectedFeesUSD = collectedValueUSD.toFixed(2);
          }
        }
      }
      
      if (debugFlag) debug.steps.push({ step: "subgraph.data", pools: poolDataMap.size, positions: positionDataMap.size });
    }

    return NextResponse.json({ positions, debug: debugFlag ? debug : undefined });
  } catch (e) {
    return NextResponse.json({ error: "Failed", debug }, { status: 500 });
  }
}


