export const ERC20_ABI = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const AERODROME_PAIR_ABI = [
  {
    type: "function",
    name: "token0",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "token1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "stable",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "_reserve0", type: "uint112" },
      { name: "_reserve1", type: "uint112" },
      { name: "_blockTimestampLast", type: "uint32" },
    ],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const NPM_ABI = [
  // ERC165: supportsInterface(bytes4)
  {
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ name: "", type: "bool" }],
  },
  // ERC721: ownerOf(tokenId)
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  // ERC721 basic: balanceOf(owner)
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ERC721Enumerable: tokenOfOwnerByIndex(owner,index)
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "nonce", type: "uint96" },
      { name: "operator", type: "address" },
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "tickSpacing", type: "int24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidity", type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0", type: "uint128" },
      { name: "tokensOwed1", type: "uint128" },
    ],
  },
] as const;

export const CL_FACTORY_ABI = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "token0", type: "address" },
      { name: "token1", type: "address" },
      { name: "tickSpacing", type: "int24" },
    ],
    outputs: [{ name: "pool", type: "address" }],
  },
] as const;

export const CL_POOL_ABI = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "unlocked", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "liquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "liquidity", type: "uint128" }],
  },
  {
    type: "function",
    name: "gauge",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "stakedLiquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint128" }],
  },
] as const;

export const CL_GAUGE_ABI = [
  {
    type: "function",
    name: "stakedValues",
    stateMutability: "view",
    inputs: [{ name: "depositor", type: "address" }],
    outputs: [{ name: "staked", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "stakedLength",
    stateMutability: "view",
    inputs: [{ name: "depositor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "earned",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "rewardRate",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "rewardToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "periodFinish",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const SUGAR_HELPER_ABI = [
  {
    type: "function",
    name: "principal",
    stateMutability: "view",
    inputs: [
      { name: "positionManager", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "sqrtRatioX96", type: "uint160" }
    ],
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ],
  },
  {
    type: "function",
    name: "fees",
    stateMutability: "view",
    inputs: [
      { name: "positionManager", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ],
  },
  {
    type: "function",
    name: "poolFees",
    stateMutability: "view",
    inputs: [
      { name: "pool", type: "address" },
      { name: "liquidity", type: "uint128" },
      { name: "tickCurrent", type: "int24" },
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" }
    ],
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" }
    ],
  },
  {
    type: "function",
    name: "getSqrtRatioAtTick",
    stateMutability: "pure",
    inputs: [{ name: "tick", type: "int24" }],
    outputs: [{ name: "sqrtRatioX96", type: "uint160" }],
  },
  {
    type: "function",
    name: "getTickAtSqrtRatio",
    stateMutability: "pure",
    inputs: [{ name: "sqrtPriceX96", type: "uint160" }],
    outputs: [{ name: "tick", type: "int24" }],
  },
] as const;

