import { h } from "./dom.js";

// Toasts live in one fixed stack so several at once don't overlap.
function stack() {
  let el = document.querySelector("#toasts");
  if (!el) {
    el = h("div", { id: "toasts", "aria-live": "polite" });
    document.body.append(el);
  }
  return el;
}

export function toast(message, kind = "info") {
  const el = h("div", { class: `toast ${kind}` }, message);
  stack().append(el);
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
