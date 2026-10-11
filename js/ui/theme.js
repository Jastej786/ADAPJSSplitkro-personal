const KEY = "splitapp:theme";

const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
const current = () => document.documentElement.dataset.theme ?? (systemDark() ? "dark" : "light");

// Applies a saved choice on load and wires the toggle button.
export function initTheme(button) {
  const saved = stored();
  if (saved) document.documentElement.dataset.theme = saved;

  const paint = () => { button.textContent = current() === "dark" ? "☀" : "☾"; };
  paint();
  button.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    paint();
  });
}
