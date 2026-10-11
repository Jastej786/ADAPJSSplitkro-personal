import { h } from "./dom.js";
import { resolvePeriod } from "../core/periods.js";

// Filter state lives for the page session, per group + tab, so a live update from a friend
// doesn't reset what you were looking at.
const states = new Map();
export function getFilters(key, defaults) {
  if (!states.has(key)) {
    states.set(key, { kind: "all", offset: 0, from: "", to: "", search: "", category: "all", member: "all", scope: "group", ...defaults });
  }
  return states.get(key);
}

const KIND_LABELS = { all: "All", week: "Week", month: "Month", year: "Year", custom: "Custom" };
const STEPPED = ["week", "month", "year"];

// Period selector: segmented control + ‹ label › stepper (or from/to dates for Custom).
export function periodBar(f, onChange, { kinds, dataRange }) {
  const pick = (kind) => { f.kind = kind; f.offset = 0; onChange(); };

  const seg = h("div", { class: "seg" }, kinds.map((k) =>
    h("button", { type: "button", class: k === f.kind ? "on" : "", onclick: () => pick(k) }, KIND_LABELS[k])));

  let second = null;
  if (STEPPED.includes(f.kind)) {
    const label = resolvePeriod(f, dataRange).label;
    second = h("div", { class: "stepper" },
      h("button", { type: "button", class: "step-btn", "aria-label": "Previous", onclick: () => { f.offset -= 1; onChange(); } }, "‹"),
      h("span", { class: "step-label" }, label),
      h("button", { type: "button", class: "step-btn", "aria-label": "Next", disabled: f.offset >= 0, onclick: () => { f.offset += 1; onChange(); } }, "›"),
      f.offset !== 0 && h("button", { type: "button", class: "link", onclick: () => { f.offset = 0; onChange(); } }, "Today"));
  } else if (f.kind === "custom") {
    second = h("div", { class: "row two" },
      h("input", { type: "date", value: f.from, "aria-label": "From", onchange: (e) => { f.from = e.target.value; onChange(); } }),
      h("input", { type: "date", value: f.to, "aria-label": "To", onchange: (e) => { f.to = e.target.value; onChange(); } }));
  }
  return h("div", { class: "period" }, seg, second);
}
