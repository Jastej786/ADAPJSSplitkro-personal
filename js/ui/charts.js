// Small dependency-free charts built from HTML/CSS so text scales properly on phones.
import { h } from "./dom.js";
import { fmt, fmtCompact } from "../core/money.js";
import { avatar } from "./avatar.js";

function niceMax(v) {
  if (v <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(v));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// buckets: [{ label, long, value, count }]  (value in cents). Hover/focus a column for details.
export function columnChart({ buckets, currency }) {
  const max = niceMax(Math.max(0, ...buckets.map((b) => b.value)));
  const tip = h("div", { class: "tip", hidden: true });
  const root = h("div", { class: "chart" });

  const show = (col, b) => {
    tip.replaceChildren(h("strong", {}, b.long), h("div", {}, fmt(b.value, currency)), b.count ? h("div", { class: "muted" }, plural(b.count, "expense")) : null);
    tip.hidden = false;
    const c = col.getBoundingClientRect(), r = root.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(c.left - r.left + c.width / 2, 72), r.width - 72)}px`;
  };

  const cols = buckets.map((b) => {
    const col = h("div", { class: "col", tabIndex: 0, role: "img", "aria-label": `${b.long}: ${fmt(b.value, currency)}` },
      h("div", { class: "bar", style: `height:${b.value ? Math.max(1.5, (b.value / max) * 100) : 0}%` }));
    col.addEventListener("pointerenter", () => show(col, b));
    col.addEventListener("focus", () => show(col, b));
    for (const ev of ["pointerleave", "blur"]) col.addEventListener(ev, () => (tip.hidden = true));
    return col;
  });

  // Label every column when there are few, otherwise thin them out to avoid collisions.
  const step = buckets.length > 12 ? Math.ceil(buckets.length / 8) : 1;
  const labels = buckets.map((b, i) => h("div", { class: "xl" }, i % step === 0 ? b.label : ""));

  root.append(
    h("div", { class: "plot" },
      [1, 0.5, 0].map((f) => h("div", { class: "gl", style: `bottom:${f * 100}%` }, h("span", {}, fmtCompact(max * f, currency)))),
      h("div", { class: "cols" }, cols)),
    h("div", { class: "xlabels" }, labels),
    tip,
    h("details", { class: "table-view" },
      h("summary", {}, "Table view"),
      h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Period"), h("th", {}, "Spent"), h("th", {}, "Expenses"))),
        h("tbody", {}, buckets.filter((b) => b.count).map((b) => h("tr", {}, h("td", {}, b.long), h("td", {}, fmt(b.value, currency)), h("td", {}, b.count)))))),
  );
  return root;
}

// rows: [{ label, icon, color, value }] sorted high→low. Each row is labelled, so colour is never the only cue.
export function categoryBars(rows, currency) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return h("ul", { class: "cat-list" }, rows.map((r) => h("li", {},
    h("div", { class: "cat-head" },
      h("span", { class: "dot", style: `background:${r.color}` }),
      h("span", { class: "grow" }, `${r.icon} ${r.label}`),
      h("span", { class: "muted small" }, `${Math.round((r.value / total) * 100)}%`),
      h("strong", {}, fmt(r.value, currency))),
    h("div", { class: "track" }, h("i", { style: `width:${(r.value / max) * 100}%;background:${r.color}` })))));
}

// people: [{ id, name, paid, share }]. Two series → always shown with a legend.
export function paidVsShare(people, currency) {
  const max = Math.max(...people.flatMap((p) => [p.paid, p.share]), 1);
  const row = (label, cls, v) => h("div", { class: "pv-row" },
    h("span", { class: "pv-label" }, label), h("div", { class: "track" }, h("i", { class: cls, style: `width:${(v / max) * 100}%` })),
    h("span", { class: "pv-val" }, fmt(v, currency)));

  return h("div", {},
    h("div", { class: "legend" }, h("span", {}, h("i", { class: "sw paid" }), "Paid"), h("span", {}, h("i", { class: "sw share" }), "Their share")),
    people.map((p) => h("div", { class: "pv" },
      h("div", { class: "pv-name" }, avatar(p, "sm"), p.name),
      row("Paid", "paid", p.paid), row("Share", "share", p.share))));
}
