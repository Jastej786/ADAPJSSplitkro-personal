import { store } from "../store/index.js";
import { nameOf } from "./members.js";
import { remember } from "./groups.js";

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function expensesToCsv(g) {
  const rows = [["Date", "Description", "Category", "Total", "Paid by", "Split"]];
  for (const e of g.expenses.filter((x) => !x.deleted)) {
    rows.push([
      e.date, e.desc, e.category, (e.amount / 100).toFixed(2),
      Object.entries(e.payers).map(([id, c]) => `${nameOf(g, id)} ${(c / 100).toFixed(2)}`).join("; "),
      Object.entries(e.owed).map(([id, c]) => `${nameOf(g, id)} ${(c / 100).toFixed(2)}`).join("; "),
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function download(filename, text, mime = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const exportCsv = (g) => download(`${g.name}.csv`, expensesToCsv(g), "text/csv");
export const exportJson = (g) => download(`${g.name}.backup.json`, JSON.stringify(g, null, 2), "application/json");

// Restores a backup made by exportJson (overwrites the group with the same id).
export async function importJson(file) {
  const g = JSON.parse(await file.text());
  if (!g?.id || !Array.isArray(g.members) || !Array.isArray(g.expenses)) throw new Error("That doesn't look like a backup file.");
  await store.create(g);
  remember(g);
  return g;
}
