import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const BASE_RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

export const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});


