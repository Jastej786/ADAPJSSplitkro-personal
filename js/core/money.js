// All money is stored as integer cents (paise) to avoid floating-point drift.
export function toCents(value) {
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function toInputString(cents) {
  return (cents / 100).toFixed(2);
}

// Rupees get Indian digit grouping (12,34,567); everything else follows the browser locale.
const localeFor = (currency) => (currency === "INR" ? "en-IN" : undefined);

export function fmt(cents, currency = "INR") {
  return new Intl.NumberFormat(localeFor(currency), { style: "currency", currency }).format(cents / 100);
}

// No decimals, for headline numbers.
export function fmtWhole(cents, currency = "INR") {
  return new Intl.NumberFormat(localeFor(currency), { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export function fmtCompact(cents, currency = "INR") {
  return new Intl.NumberFormat(localeFor(currency), { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);
}
