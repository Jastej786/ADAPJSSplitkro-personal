// Spending analytics. Pure functions over a group object.
import { inPeriod, makeBuckets, parseIso, iso } from "./periods.js";

const live = (g) => g.expenses.filter((e) => !e.deleted);

// scope "group" = whole expense; "me" = only my share of it.
export const amountFor = (e, meId, scope) => (scope === "me" ? e.owed[meId] ?? 0 : e.amount);

export function dateRange(g) {
  const dates = live(g).map((e) => e.date).sort();
  return dates.length ? { min: dates[0], max: dates[dates.length - 1] } : null;
}

export function totalIn(g, meId, period, scope) {
  return live(g).filter((e) => inPeriod(e.date, period)).reduce((s, e) => s + amountFor(e, meId, scope), 0);
}

export function computeStats(g, meId, period, scope) {
  const buckets = makeBuckets(period.start, period.end, period.bucket).map((b) => ({ ...b, value: 0, count: 0 }));
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  const keyOf = { day: (d) => d, month: (d) => d.slice(0, 7), year: (d) => d.slice(0, 4) }[period.bucket];

  const categories = new Map();
  const people = new Map(g.members.map((m) => [m.id, { id: m.id, name: m.name, paid: 0, share: 0 }]));
  const included = [];
  let total = 0;

  for (const e of live(g).filter((x) => inPeriod(x.date, period))) {
    const v = amountFor(e, meId, scope);
    if (scope === "me" && v === 0) continue; // not part of this expense
    included.push({ e, v });
    total += v;
    const b = byKey.get(keyOf(e.date));
    if (b) { b.value += v; b.count += 1; }
    categories.set(e.category, (categories.get(e.category) ?? 0) + v);
    for (const [id, c] of Object.entries(e.payers)) if (people.has(id)) people.get(id).paid += c;
    for (const [id, c] of Object.entries(e.owed)) if (people.has(id)) people.get(id).share += c;
  }

  // Days elapsed in the period so far (future days don't dilute the average).
  const today = new Date();
  const last = iso(today) < period.end ? iso(today) : period.end;
  const days = Math.max(1, Math.round((parseIso(last) - parseIso(period.start)) / 86400000) + 1);

  return {
    total,
    count: included.length,
    perDay: Math.round(total / days),
    buckets,
    categories: [...categories].map(([id, value]) => ({ id, value })).sort((a, b) => b.value - a.value),
    people: [...people.values()].filter((p) => p.paid || p.share),
    top: included.sort((a, b) => b.v - a.v).slice(0, 5),
  };
}
