/**
 * Generate static manifest file from minikit.config.ts
 * This ensures the manifest is available at /public/.well-known/farcaster.json
 * even if the API route is not accessible
 */
const fs = require('fs');
const path = require('path');

// Since we can't import TypeScript directly, we'll read the config values
// In practice, this would be better as a TypeScript script, but for simplicity
// we'll use the existing minikit.config structure

const ROOT_URL =
  process.env.NEXT_PUBLIC_ROOT_URL ||
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://lping.vercel.app');

const manifest = {
  accountAssociation: {
    header: "eyJmaWQiOjQzMTcyMCwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweEVEODI2Mjk1MTllRGIzQTM4NWZBNTg2ODNkZEFCMmFlMThBNENhNTkifQ",
    payload: "eyJkb21haW4iOiJscGluZy52ZXJjZWwuYXBwIn0",
    signature: "38beppG/dWLJhgU2h+LJpNO2N6ezWh93lLd7euatzxd9tlq6m4HUgla5deWxFEQo9vwv5g0H07IkQnZWaKBFPhs="
  },
  baseBuilder: {
    ownerAddress: process.env.NEXT_PUBLIC_BASE_BUILDER_ADDRESS || ""
  },
  miniapp: {
    version: "1",
    name: "LPing",
    homeUrl: ROOT_URL,
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#000000",
    webhookUrl: `${ROOT_URL}/api/webhook`,
    subtitle: "Your Personal LP Assistant",
    description: "Real-time monitoring of your Aerodrome Concentrated Liquidity positions. Track rewards, analyze performance, and never miss an opportunity.",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    primaryCategory: "finance",
    tags: ["defi", "lp", "aerodrome", "liquidity", "crypto"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`,
    tagline: "LP Journey Together",
    ogTitle: "LPing - LP Position Tracker",
    ogDescription: "Real-time monitoring of your Aerodrome Concentrated Liquidity positions",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`
  }
};

const manifestPath = path.join(process.cwd(), 'public', '.well-known', 'farcaster.json');
const manifestDir = path.dirname(manifestPath);

// Ensure directory exists
if (!fs.existsSync(manifestDir)) {
  fs.mkdirSync(manifestDir, { recursive: true });
}

// Write manifest file
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✅ Generated manifest at ${manifestPath}`);

