import { toCents } from "./money.js";

// Split `total` cents across `ids` proportionally to `weights`, with no cent lost:
// floor everything, then hand leftover cents to the largest fractional remainders.
export function allocate(total, ids, weights) {
  const sum = ids.reduce((s, id) => s + weights[id], 0);
  const parts = ids.map((id) => {
    const exact = (total * weights[id]) / sum;
    return { id, base: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let left = total - parts.reduce((s, p) => s + p.base, 0);
  [...parts].sort((a, b) => b.frac - a.frac).forEach((p) => {
    if (left > 0) { p.base += 1; left -= 1; }
  });
  return Object.fromEntries(parts.map((p) => [p.id, p.base]));
}

// Returns { owed: {memberId: cents} } or { error: string }.
// `ids` = people included in the split; `vals` = raw input strings per person (non-equal types).
export function computeOwed(total, type, ids, vals = {}) {
  if (!(total > 0)) return { error: "Enter an amount greater than zero." };
  if (!ids.length) return { error: "Select at least one person to split with." };

  if (type === "equal") {
    return { owed: allocate(total, ids, Object.fromEntries(ids.map((i) => [i, 1]))) };
  }

  if (type === "exact") {
    const owed = {};
    let sum = 0;
    for (const id of ids) {
      const c = toCents(vals[id] || 0);
      if (!(c >= 0)) return { error: "Amounts must be valid numbers." };
      owed[id] = c;
      sum += c;
    }
    if (sum !== total) return { error: `Amounts differ from the total by ${((total - sum) / 100).toFixed(2)}.` };
    return { owed };
  }

  const weights = {};
  let sum = 0;
  for (const id of ids) {
    const w = parseFloat(vals[id] || 0);
    if (!(w >= 0)) return { error: "Values must be valid numbers." };
    weights[id] = w;
    sum += w;
  }
  if (type === "percent" && Math.abs(sum - 100) > 0.005) {
    return { error: `Percentages add up to ${+sum.toFixed(2)}%, not 100%.` };
  }
  if (!(sum > 0)) return { error: "Shares must add up to more than zero." };
  return { owed: allocate(total, ids, weights) };
}

export function validatePayers(total, payers) {
  const sum = Object.values(payers).reduce((s, c) => s + c, 0);
  if (!Object.keys(payers).length) return "Say who paid.";
  if (sum !== total) return `Paid amounts differ from the total by ${((total - sum) / 100).toFixed(2)}.`;
  return null;
}
