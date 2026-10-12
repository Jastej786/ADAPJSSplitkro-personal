// Shared by the app and the reminder job, so both agree on what a valid address is.
const SHAPE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

// Returns a clean lowercase address, "" for empty, or null when it isn't a valid address.
export function normalizeEmail(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return "";
  return s.length <= 254 && SHAPE.test(s) ? s : null;
}

// a***@g***.com — for logs, which are public on a public repo.
export function maskEmail(email) {
  const [user = "", domain = ""] = String(email).split("@");
  const [host = "", ...tld] = domain.split(".");
  return `${user[0] ?? ""}***@${host[0] ?? ""}***.${tld.join(".")}`;
}
