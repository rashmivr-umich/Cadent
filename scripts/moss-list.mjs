// Lists the indexes in our Moss project. Read only: changes nothing.
// Usage: node --env-file=.env scripts/moss-list.mjs
import { MossClient } from "@moss-js/moss";

const { MOSS_PROJECT_ID, MOSS_PROJECT_KEY } = process.env;
if (!MOSS_PROJECT_ID || !MOSS_PROJECT_KEY) {
  console.error("MOSS_PROJECT_ID or MOSS_PROJECT_KEY is missing from .env");
  process.exit(1);
}

const client = new MossClient(MOSS_PROJECT_ID, MOSS_PROJECT_KEY);
const indexes = await client.listIndexes();
console.log(`Found ${indexes.length} index(es):`);
for (const i of indexes) {
  console.log(`- ${i.name}: ${i.docCount} docs, status ${i.status}, model ${i.model?.id ?? "?"}`);
}
