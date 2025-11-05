import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL || 
  process.env.ALCHEMY_BASE_HTTP ||
  (process.env.ALCHEMY_BASE_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_BASE_KEY}` : null) ||
  "https://mainnet.base.org";

if (process.env.NODE_ENV === 'development') {
  console.log('[viemClient] Initializing with RPC URL:', BASE_RPC_URL.replace(/\/v2\/[^\/]+/, '/v2/***'));
}

export const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL, {
    timeout: 30000, // 30 second timeout for localhost
    retryCount: 3,
    retryDelay: 1000,
  }),
});


