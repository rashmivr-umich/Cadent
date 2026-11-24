// Reads every raw SAM.gov file in data/sam_cache/ (never changes them), applies the
// CLAUDE.md rules, keeps only the fields in docs/ui_fields_for_moss.csv, and writes
// data/leads_clean.json.
// Usage: node scripts/clean-leads.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const CACHE = "data/sam_cache";
const OUT = "data/leads_clean.json";
const CUTOFF = "2022-04-04"; // CLAUDE.md: drop records last updated before this date
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

const files = readdirSync(CACHE).filter((f) => f.endsWith(".json")).sort();
const byId = new Map(); // newest file wins if the same company appears twice
const dropped = [];

for (const file of files) {
  const raw = JSON.parse(readFileSync(`${CACHE}/${file}`, "utf8"));
  for (const e of raw.entityData || []) {
    const r = e.entityRegistration;
    const c = e.coreData;
    const g = e.assertions?.goodsAndServices || {};
    const name = r.legalBusinessName;

    // ---- Rules (CLAUDE.md section 4) ----
    const why = [];
    if (!r.lastUpdateDate || r.lastUpdateDate < CUTOFF) why.push(`last updated ${r.lastUpdateDate} (before ${CUTOFF})`);
    if (/d\s*&\s*b|dun/i.test(r.evsSource || "")) why.push(`data source is ${r.evsSource}`);
    if (r.dnbOpenData) why.push("has D&B open data");
    if (r.publicDisplayFlag !== "Y") why.push("not marked for public display");
    if (r.exclusionStatusFlag !== "N") why.push("excluded from federal work");
    if (r.registrationStatus !== "Active") why.push(`status ${r.registrationStatus}`);
    if (why.length) { dropped.push({ name, why }); continue; }

    // ---- Calculated fields ----
    const exp = r.registrationExpirationDate;
    const daysToExpiry = Math.round((new Date(exp + "T00:00:00Z") - today) / 86400000);
    const naicsList = (g.naicsList || []).map((n) => ({
      code: n.naicsCode, name: (n.naicsDescription || "").trim(), small: n.sbaSmallBusiness,
    }));
    const primary = naicsList.find((n) => n.code === g.primaryNaics);
    const poc = e.pointsOfContact?.governmentBusinessPOC || {};
    const fmt = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

    byId.set(r.ueiSAM, {
      id: r.ueiSAM,
      // Shown + searchable
      legalName: name,
      dbaName: r.dbaName || null,
      city: c.physicalAddress.city,
      state: c.physicalAddress.stateOrProvinceCode,
      primaryNaics: g.primaryNaics,
      primaryNaicsName: primary?.name || null,
      naicsList,
      productsAndServices: (g.pscList || []).map((p) => p.pscDescription).filter(Boolean),
      businessTypes: (c.businessTypes?.businessTypeList || []).map((b) => b.businessTypeDesc).filter(Boolean),
      // Dates + status
      registrationExpirationDate: exp,
      daysToExpiry, // as of asOf below; the app recalculates it each day
      registrationDate: r.registrationDate,
      registrationStatus: r.registrationStatus,
      lastUpdateDate: r.lastUpdateDate,
      signals: [daysToExpiry >= 0
        ? `SAM.gov registration expires ${fmt(exp)} (in ${daysToExpiry} day${daysToExpiry === 1 ? "" : "s"})`
        : `SAM.gov registration expired ${fmt(exp)}`],
      // Source
      samSource: { api: "SAM.gov Entity API v4", uei: r.ueiSAM, file, fetchedOn: file.match(/\d{4}-\d{2}-\d{2}/)?.[0] },
      samSourceUrl: null, // public record link format not confirmed yet
      // Contact (SAM.gov gives name + title only)
      website: c.entityInformation?.entityURL || null,
      contactName: [poc.firstName, poc.lastName].filter(Boolean).join(" ") || null,
      contactTitle: poc.title || null,
      // Filled later by other steps
      fitScore: null, tier: null, scoreReasons: [],
      email: null, emailStatus: null,
      draftSubject: null, draftBody: null, agentUnsure: [],
      stage: "Matched", stageHistory: [],
    });
  }
}

const leads = [...byId.values()].sort((a, b) => a.daysToExpiry - b.daysToExpiry);
writeFileSync(OUT, JSON.stringify({ asOf: today.toISOString().slice(0, 10), count: leads.length, leads }, null, 2));

console.log(`Read ${files.length} raw file(s). Kept ${leads.length}, dropped ${dropped.length}.`);
for (const d of dropped) console.log(`  dropped ${d.name}: ${d.why.join("; ")}`);
for (const l of leads) console.log(`  ${String(l.daysToExpiry).padStart(4)} days  ${l.legalName} (${l.city}, ${l.state})  website: ${l.website ? "yes" : "no"}`);
console.log(`Saved ${OUT}. Raw files untouched.`);
