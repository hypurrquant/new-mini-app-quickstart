const ROOT_URL =
  process.env.NEXT_PUBLIC_ROOT_URL ||
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjQzMTcyMCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEVEODI2Mjk1MTllRGIzQTM4NWZBNTg2ODNkZEFCMmFlMThBNENhNTkifQ",
    payload: "eyJkb21haW4iOiJscGluZy52ZXJjZWwuYXBwIn0",
    signature: "38beppG/dWLJhgU2h+LJpNO2N6ezWh93lLd7euatzxd9tlq6m4HUgla5deWxFEQo9vwv5g0H07IkQnZWaKBFPhs="
  },
  // Base Builder configuration (optional)
  // Add your Base Account address here if you have one
  // @see https://docs.base.org/mini-apps/quickstart/migrate-existing-apps
  baseBuilder: {
    ownerAddress: process.env.NEXT_PUBLIC_BASE_BUILDER_ADDRESS || "", // Add your Base Account address
  },
  miniapp: {
    version: "1",
    name: "LPing", 
    subtitle: "Your Personal LP Assistant", 
    description: "Real-time monitoring of your Aerodrome Concentrated Liquidity positions. Track rewards, analyze performance, and never miss an opportunity.",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "finance",
    tags: ["defi", "lp", "aerodrome", "liquidity", "crypto"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "LP Journey Together",
    ogTitle: "LPing - LP Position Tracker",
    ogDescription: "Real-time monitoring of your Aerodrome Concentrated Liquidity positions",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

