import { h } from "../dom.js";
import { getFilters, periodBar } from "../filters.js";
import { columnChart, categoryBars, paidVsShare } from "../charts.js";
import { categoryOf } from "../../core/categories.js";
import { resolvePeriod } from "../../core/periods.js";
import { computeStats, dateRange, totalIn } from "../../core/stats.js";
import { fmt, fmtWhole } from "../../core/money.js";
import { fmtDate } from "../../core/dates.js";

const STEPPED = { week: "week", month: "month", year: "year" };

export function insightsTab(g, { meId, rerender }) {
  if (!g.expenses.some((e) => !e.deleted)) return h("p", { class: "muted center" }, "Add some expenses and your spending insights will appear here.");

  const f = getFilters(`${g.id}:insights`, { kind: "month" });
  const range = dateRange(g);
  const period = resolvePeriod(f, range);
  const st = computeStats(g, meId, period, f.scope);
  const money = (c) => fmt(c, g.currency);
  const whole = (c) => fmtWhole(c, g.currency);

  // Compare with the previous week / month / year when browsing one of those.
  let delta = null;
  if (STEPPED[f.kind]) {
    const prev = totalIn(g, meId, resolvePeriod({ ...f, offset: f.offset - 1 }, range), f.scope);
    if (prev > 0) delta = Math.round(((st.total - prev) / prev) * 100);
  }

  const scopeToggle = h("div", { class: "seg" }, [["group", "Whole group"], ["me", "Just me"]].map(([id, label]) =>
    h("button", { type: "button", class: f.scope === id ? "on" : "", onclick: () => { f.scope = id; rerender(); } }, label)));

  const kpi = (label, value, sub) => h("div", { class: "kpi" }, h("div", { class: "kpi-label" }, label), h("div", { class: "kpi-value" }, value), sub && h("div", { class: "kpi-sub" }, sub));
  const biggest = st.top[0];

  const section = (title, body) => h("section", { class: "insight" }, h("h3", {}, title), body);

  return h("div", { class: "insights" },
    h("div", { class: "controls" }, scopeToggle, periodBar(f, rerender, { kinds: ["week", "month", "year", "all", "custom"], dataRange: range })),

    st.count === 0
      ? h("p", { class: "muted center" }, `No ${f.scope === "me" ? "spending of yours" : "expenses"} in this period.`)
      : [
        h("div", { class: "kpis" },
          kpi(f.scope === "me" ? "Your spending" : "Group spending", whole(st.total),
            delta != null && `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs previous ${f.kind}`),
          kpi("Per day", whole(st.perDay), period.label),
          kpi("Expenses", String(st.count)),
          kpi("Biggest", whole(biggest.v), biggest.e.desc)),

        section("Spending over time", columnChart({ buckets: st.buckets, currency: g.currency })),
        section("By category", categoryBars(st.categories.map((c) => ({ ...categoryOf(c.id), value: c.value })), g.currency)),
        f.scope === "group" && st.people.length > 1 && section("Who paid vs who owes", paidVsShare(st.people, g.currency)),
        section("Biggest expenses", h("ul", { class: "list" }, st.top.map(({ e, v }) => h("li", { class: "item" },
          h("div", { class: "icon-cell" }, categoryOf(e.category).icon),
          h("div", { class: "grow" }, h("strong", {}, e.desc), h("div", { class: "muted small" }, fmtDate(e.date))),
          h("div", { class: "amount" }, money(v)))))),
      ]);
}
