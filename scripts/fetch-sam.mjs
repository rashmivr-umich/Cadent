// Makes ONE request to the SAM.gov Entity API (v4) and saves the raw response.
// Usage:
//   node --env-file=.env scripts/fetch-sam.mjs          -> prints the URL (key hidden), does NOT call SAM.gov
//   node --env-file=.env scripts/fetch-sam.mjs --run    -> makes the single request and saves it
// No retries. Each --run uses 1 of the 10 daily SAM.gov requests.

import { mkdirSync, writeFileSync } from "node:fs";

const key = process.env.SAM_API_KEY;
if (!key) {
  console.error("SAM_API_KEY is missing from .env");
  process.exit(1);
}

const params = new URLSearchParams({
  registrationStatus: "A", // A = active registrations
  primaryNaics: "541512", // Computer Systems Design Services
  physicalAddressProvinceOrStateCode: "VA", // Virginia
  page: "0",
  size: "10", // 10 results (the API maximum per page)
});

const base = "https://api.sam.gov/entity-information/v4/entities";
const safeUrl = `${base}?api_key=HIDDEN&${params}`;
console.log("Request URL:\n" + safeUrl);

if (!process.argv.includes("--run")) {
  console.log("\nDry run only. Add --run to make the request.");
  process.exit(0);
}

const res = await fetch(`${base}?api_key=${encodeURIComponent(key)}&${params}`);
const body = await res.text(); // keep the response exactly as received

mkdirSync("data/sam_cache", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = `data/sam_cache/entities_541512_VA_p0_${stamp}.json`;
writeFileSync(file, body);

console.log(`\nHTTP ${res.status}. Saved raw response to ${file} (${body.length} bytes).`);
if (!res.ok) process.exit(1);
