import { h } from "./dom.js";

export function toast(message, kind = "info") {
  const el = h("div", { class: `toast ${kind}` }, message);
  document.body.append(el);
  setTimeout(() => el.remove(), 3500);
}

// Runs an async action, showing any error as a toast. Returns true on success.
export async function attempt(fn) {
  try {
    await fn();
    return true;
  } catch (err) {
    toast(err.message || String(err), "error");
    return false;
  }
}
