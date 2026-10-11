import { h } from "../dom.js";
import { fmtTime } from "../../core/dates.js";

export function activityTab(g) {
  if (!g.activity?.length) return h("p", { class: "muted center" }, "Nothing has happened yet.");
  return h("ul", { class: "list" }, g.activity.map((a) =>
    h("li", { class: "item" }, h("div", { class: "grow" }, a.text, h("div", { class: "muted small" }, fmtTime(a.ts))))));
}
