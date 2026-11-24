// Reads an uploaded .xlsx or .csv in the browser and pulls out company names.
// Nothing is uploaded anywhere: the file is read on the user's own computer.

const NAME_COLUMN_HINTS = ['company', 'client', 'organization', 'organisation', 'business', 'account', 'name'];

export async function parseClientFile(file: File): Promise<string[]> {
  // Load the spreadsheet library only when someone actually uploads a file.
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  if (rows.length === 0) return [];

  // Find the column whose header looks most like "company name".
  const header = rows[0].map((cell) => String(cell ?? '').toLowerCase().trim());
  let column = -1;
  for (const hint of NAME_COLUMN_HINTS) {
    column = header.findIndex((h) => h.includes(hint));
    if (column !== -1) break;
  }
  // No recognizable header: assume the first column is company names, and row 1 is data.
  const dataRows = column === -1 ? rows : rows.slice(1);
  if (column === -1) column = 0;

  return uniqueNames(dataRows.map((row) => String(row[column] ?? '')));
}

/** Pasted text: one company per line (commas and semicolons also work). */
export function parsePastedNames(text: string): string[] {
  return uniqueNames(text.split(/[\n,;]+/));
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}
