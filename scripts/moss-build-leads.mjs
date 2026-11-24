// Creates the Moss "leads" index from data/leads_clean.json, then runs one test search.
// Safety: if a "leads" index already exists, this script stops and changes nothing.
// Usage: node --env-file=.env scripts/moss-build-leads.mjs
import { readFileSync } from "node:fs";
import { MossClient } from "@moss-js/moss";

const INDEX = "leads";
const client = new MossClient(process.env.MOSS_PROJECT_ID, process.env.MOSS_PROJECT_KEY);

const existing = await client.listIndexes();
if (existing.some((i) => i.name === INDEX)) {
  console.log(`"${INDEX}" already exists. Not touching it.`);
  process.exit(0);
}

const { leads } = JSON.parse(readFileSync("data/leads_clean.json", "utf8"));
const epoch = (d) => String(Math.floor(Date.parse(d + "T00:00:00Z") / 1000));

// text = what Maria searches by; metadata = filters + full lead for the app to show
const docs = leads.map((l) => ({
  id: l.id,
  text: [
    l.legalName + (l.dbaName ? ` (also known as ${l.dbaName})` : "") + ".",
    `${l.city}, ${l.state}.`,
    l.primaryNaicsName ? `${l.primaryNaicsName}.` : "",
    l.naicsList.length ? `Industries: ${l.naicsList.map((n) => n.name).join(", ")}.` : "",
    l.productsAndServices.length ? `Products and services: ${l.productsAndServices.join(", ")}.` : "",
    l.businessTypes.length ? `Business types: ${l.businessTypes.join(", ")}.` : "",
  ].filter(Boolean).join(" "),
  metadata: {
    state: l.state,
    expiresAt: epoch(l.registrationExpirationDate),
    lead: JSON.stringify(l),
  },
}));

console.log(`Creating "${INDEX}" with ${docs.length} leads...`);
const res = await client.createIndex(INDEX, docs, { modelId: "moss-minilm" });
console.log(`Created: ${res.docCount} docs (job ${res.jobId}).`);

// ---- One test search ----
await client.loadIndex(INDEX);
const q = "IT services company in Northern Virginia expiring soon";
const in30days = Math.floor(Date.now() / 1000) + 30 * 86400;
const out = await client.query(INDEX, q, {
  topK: 5,
  filter: { $and: [
    { field: "state", condition: { $eq: "VA" } },
    { field: "expiresAt", condition: { $lte: in30days } },
  ] },
});
console.log(`\nTest search: "${q}" (VA, expiring within 30 days)`);
for (const d of out.docs) {
  const l = JSON.parse(d.metadata.lead);
  console.log(`  score ${d.score.toFixed(2)}  ${l.legalName} (${l.city})  expires ${l.registrationExpirationDate}`);
}
