
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjQzMTcyMCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEVEODI2Mjk1MTllRGIzQTM4NWZBNTg2ODNkZEFCMmFlMThBNENhNTkifQ",
    payload: "eyJkb21haW4iOiJscGluZy52ZXJjZWwuYXBwIn0",
    signature: "38beppG/dWLJhgU2h+LJpNO2N6ezWh93lLd7euatzxd9tlq6m4HUgla5deWxFEQo9vwv5g0H07IkQnZWaKBFPhs="
  },
  baseBuilder: {
    ownerAddress: "0xb4fdb1C3A10ddA2cA109168c4A46f28b7Dc7156c",
  },
  miniapp: {
    version: "1",
    name: "LPing", 
    subtitle: "Your Personal LP Assistant", 
    description: "Real-time monitoring of your Aerodrome Concentrated Liquidity positions. Track rewards, analyze performance, and never miss an opportunity.",
    screenshotUrls: [`https://lping.vercel.app/screenshot-1.png`,
      `https://lping.vercel.app/screenshot-2.png`,
      `https://lping.vercel.app/screenshot-3.png`,
    ],
    iconUrl: `https://lping.vercel.app/logo.png`,
    splashImageUrl: `https://lping.vercel.app/logo_.png`,
    splashBackgroundColor: "#000000",
    homeUrl: "https://lping.vercel.app/",
    webhookUrl: "https://lping.vercel.app/api/webhook",
    primaryCategory: "finance",
    tags: ["defi", "lp", "aerodrome", "liquidity", "crypto"],
    heroImageUrl: `https://lping.vercel.app/logo_.png`, 
    tagline: "LP Journey Together",
    ogTitle: "LPing - LP Position Tracker",
    ogDescription: "Real-time monitoring of your Aerodrome Concentrated Liquidity positions",
    ogImageUrl: `https://lping.vercel.app/logo_.png`,
    // Set noindex to false for production to enable search indexing
    // Set to true only for development/staging environments
    noindex: process.env.NODE_ENV === 'production' ? false : true,
  },      
} as const;

