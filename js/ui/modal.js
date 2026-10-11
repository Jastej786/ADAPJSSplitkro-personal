import { h } from "./dom.js";

export function openModal(title, body) {
  const overlay = h("div", { class: "overlay" });
  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => e.key === "Escape" && close();

  overlay.append(
    h("div", { class: "modal", role: "dialog" },
      h("header", {}, h("h2", {}, title), h("button", { class: "icon", type: "button", onclick: close, "aria-label": "Close" }, "×")),
      body,
    ),
  );
  overlay.addEventListener("mousedown", (e) => e.target === overlay && close());
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  return { close };
}
