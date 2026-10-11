// All money is stored as integer cents (paise) to avoid floating-point drift.
export function toCents(value) {
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

export function toInputString(cents) {
  return (cents / 100).toFixed(2);
}

export function fmt(cents, currency = "INR") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}
