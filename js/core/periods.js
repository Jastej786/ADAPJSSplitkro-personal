// Date-range maths for filters and charts. Dates are "YYYY-MM-DD" strings in local time.
const pad = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmtShort = (d, withYear) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(withYear && { year: "numeric" }) });

function rangeLabel(s, e) {
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${fmtShort(s, !sameYear)} – ${fmtShort(e, true)}`;
}

// Day buckets for short ranges, months for medium, years for long.
function bucketFor(s, e) {
  const days = Math.round((e - s) / 86400000) + 1;
  if (days <= 62) return "day";
  return days <= 366 * 3 ? "month" : "year";
}

// period = { kind: "week"|"month"|"year"|"all"|"custom", offset, from, to }
// dataRange = { min, max } of expense dates (used for "all"). Returns { start, end, bucket, label }.
export function resolvePeriod({ kind, offset = 0, from, to }, dataRange, now = new Date()) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (kind === "week") {
    const s = addDays(t, -((t.getDay() + 6) % 7) + offset * 7); // weeks start Monday
    const e = addDays(s, 6);
    return { start: iso(s), end: iso(e), bucket: "day", label: rangeLabel(s, e) };
  }
  if (kind === "month") {
    const s = new Date(t.getFullYear(), t.getMonth() + offset, 1);
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    return { start: iso(s), end: iso(e), bucket: "day", label: s.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  }
  if (kind === "year") {
    const y = t.getFullYear() + offset;
    return { start: `${y}-01-01`, end: `${y}-12-31`, bucket: "month", label: String(y) };
  }

  let s, e;
  if (kind === "custom" && from && to) {
    [s, e] = [parseIso(from), parseIso(to)];
    if (s > e) [s, e] = [e, s];
  } else {
    s = parseIso(dataRange?.min ?? iso(t));
    e = parseIso(dataRange?.max ?? iso(t));
  }
  return { start: iso(s), end: iso(e), bucket: bucketFor(s, e), label: kind === "all" ? "All time" : rangeLabel(s, e) };
}

export const inPeriod = (date, p) => (!p.start || date >= p.start) && (!p.end || date <= p.end);

export const bucketKey = (date, bucket) => (bucket === "day" ? date : bucket === "month" ? date.slice(0, 7) : date.slice(0, 4));

// Empty buckets covering start..end so charts show gaps as zero bars.
export function makeBuckets(start, end, bucket) {
  const out = [];
  const e = parseIso(end);
  let d = parseIso(start);
  if (bucket === "month") d = new Date(d.getFullYear(), d.getMonth(), 1);
  if (bucket === "year") d = new Date(d.getFullYear(), 0, 1);
  const total = bucket === "day" ? Math.round((e - d) / 86400000) + 1 : Infinity;

  while (d <= e) {
    const date = iso(d);
    const label = bucket === "day" ? (total <= 7 ? d.toLocaleDateString(undefined, { weekday: "short" }) : String(d.getDate()))
      : bucket === "month" ? d.toLocaleDateString(undefined, { month: "short" }) : String(d.getFullYear());
    const long = bucket === "day" ? d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
      : bucket === "month" ? d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : String(d.getFullYear());
    out.push({ key: bucketKey(date, bucket), date, label, long });
    d = bucket === "day" ? addDays(d, 1) : bucket === "month" ? new Date(d.getFullYear(), d.getMonth() + 1, 1) : new Date(d.getFullYear() + 1, 0, 1);
  }
  return out;
}
