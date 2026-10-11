import { h, option } from "../dom.js";
import { openExpenseForm } from "../expenseForm.js";
import { getFilters, periodBar } from "../filters.js";
import { attempt } from "../toast.js";
import { categories, categoryOf } from "../../core/categories.js";
import { inPeriod, resolvePeriod, parseIso } from "../../core/periods.js";
import { dateRange } from "../../core/stats.js";
import { fmt } from "../../core/money.js";
import { nameOf, activeMembers } from "../../features/members.js";
import { setExpenseDeleted } from "../../features/expenses.js";
import { setSettlementDeleted } from "../../features/settle.js";

const monthTitle = (key) => parseIso(`${key}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function expensesTab(g, ctx) {
  const { meId, rerender } = ctx;
  const f = getFilters(`${g.id}:expenses`, { kind: "all" });
  const money = (c) => fmt(c, g.currency);
  const range = dateRange(g);
  const list = h("div", { class: "feed" });

  const search = h("input", { type: "search", placeholder: "Search expenses or people", value: f.search, "aria-label": "Search", oninput: (e) => { f.search = e.target.value; renderList(); } });
  const category = h("select", { "aria-label": "Category", onchange: (e) => { f.category = e.target.value; renderList(); syncClear(); } },
    option("all", "All categories", f.category === "all"), categories.map((c) => option(c.id, `${c.icon} ${c.label}`, f.category === c.id)));
  const person = h("select", { "aria-label": "Person", onchange: (e) => { f.member = e.target.value; renderList(); syncClear(); } },
    option("all", "Everyone", f.member === "all"), activeMembers(g).map((m) => option(m.id, m.id === meId ? `${m.name} (you)` : m.name, f.member === m.id)));

  const isFiltering = () => f.kind !== "all" || f.category !== "all" || f.member !== "all" || f.search.trim();
  const clear = h("button", { type: "button", class: "link", onclick: () => { Object.assign(f, { kind: "all", offset: 0, category: "all", member: "all", search: "" }); rerender(); } }, "Clear filters");
  const syncClear = () => (clear.hidden = !isFiltering());
  syncClear();

  function renderList() {
    const period = resolvePeriod(f, range);
    const q = f.search.trim().toLowerCase();
    const involves = (ids) => f.member === "all" || ids.includes(f.member);
    const searching = q || f.category !== "all";

    const items = [
      ...g.expenses
        .filter((e) => (f.kind === "all" || inPeriod(e.date, period)) && (f.category === "all" || e.category === f.category)
          && involves([...Object.keys(e.payers), ...Object.keys(e.owed)])
          && (!q || `${e.desc} ${Object.keys({ ...e.payers, ...e.owed }).map((id) => nameOf(g, id)).join(" ")}`.toLowerCase().includes(q)))
        .map((x) => ({ kind: "expense", date: x.date, ts: x.createdAt, x })),
      ...(searching ? [] : g.settlements
        .filter((s) => (f.kind === "all" || inPeriod(s.date, period)) && involves([s.from, s.to]))
        .map((x) => ({ kind: "payment", date: x.date, ts: x.createdAt, x }))),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);

    if (!items.length) {
      list.replaceChildren(h("p", { class: "muted center" }, isFiltering() ? "Nothing matches these filters." : "No expenses yet. Add the first one!"));
      return;
    }

    const months = new Map();
    for (const it of items) {
      const k = it.date.slice(0, 7);
      if (!months.has(k)) months.set(k, []);
      months.get(k).push(it);
    }
    const spent = items.filter((i) => i.kind === "expense" && !i.x.deleted).reduce((s, i) => s + i.x.amount, 0);

    const summary = isFiltering()
      ? h("div", { class: "filter-summary" }, `${items.filter((i) => i.kind === "expense" && !i.x.deleted).length} expenses · ${money(spent)}`)
      : null;
    const sections = [...months].map(([key, rows]) => h("section", {},
      h("div", { class: "month-head" }, h("span", {}, monthTitle(key)),
        h("span", {}, money(rows.filter((i) => i.kind === "expense" && !i.x.deleted).reduce((s, i) => s + i.x.amount, 0)))),
      h("ul", { class: "list" }, rows.map((it) => (it.kind === "payment" ? paymentRow(it.x) : expenseRow(it.x))))));
    list.replaceChildren(...[summary, ...sections].filter(Boolean));
  }

  const dateBox = (iso) => {
    const d = parseIso(iso);
    return h("div", { class: "datebox" }, h("span", {}, d.toLocaleDateString(undefined, { month: "short" })), h("b", {}, d.getDate()));
  };

  function paymentRow(s) {
    return h("li", { class: `item ${s.deleted ? "deleted" : ""}` },
      dateBox(s.date),
      h("div", { class: "grow" },
        h("strong", {}, `${nameOf(g, s.from)} paid ${nameOf(g, s.to)}`),
        h("div", { class: "muted small" }, "🤝 Payment")),
      h("div", { class: "amount" }, money(s.amount)),
      h("button", { class: "link", onclick: () => attempt(() => setSettlementDeleted(g.id, s.id, !s.deleted, meId)) }, s.deleted ? "Restore" : "✕"));
  }

  function expenseRow(e) {
    const diff = (e.payers[meId] ?? 0) - (e.owed[meId] ?? 0);
    const involved = meId in e.payers || meId in e.owed;
    const who = Object.keys(e.payers).map((id) => (id === meId ? "You" : nameOf(g, id))).join(", ");
    return h("li", {
      class: `item ${e.deleted ? "deleted" : "clickable"}`,
      onclick: (ev) => { if (!e.deleted && !ev.target.closest("button")) openExpenseForm(g, meId, e); },
    },
      dateBox(e.date),
      h("div", { class: "grow" },
        h("strong", {}, e.desc),
        h("div", { class: "muted small" }, `${categoryOf(e.category).icon} ${who} paid ${money(e.amount)}`)),
      e.deleted
        ? h("button", { class: "link", onclick: () => attempt(() => setExpenseDeleted(g.id, e.id, false, meId)) }, "Restore")
        : h("div", { class: `amount-col ${diff > 0 ? "pos" : diff < 0 ? "neg" : ""}` },
            h("span", { class: "small" }, !involved ? "not involved" : diff > 0 ? "you lent" : diff < 0 ? "you owe" : "settled"),
            involved && diff !== 0 && h("strong", {}, money(Math.abs(diff)))));
  }

  renderList();
  return h("div", {},
    h("div", { class: "filters" },
      search,
      h("div", { class: "row two" }, category, person),
      periodBar(f, rerender, { kinds: ["all", "week", "month", "year", "custom"], dataRange: range }),
      clear),
    list);
}
