import { h } from "../dom.js";
import { openExpenseForm } from "../expenseForm.js";
import { attempt } from "../toast.js";
import { categoryOf } from "../../core/categories.js";
import { fmt } from "../../core/money.js";
import { fmtDate } from "../../core/dates.js";
import { nameOf } from "../../features/members.js";
import { setExpenseDeleted } from "../../features/expenses.js";
import { setSettlementDeleted } from "../../features/settle.js";

export function expensesTab(g, { meId }) {
  const items = [
    ...g.expenses.map((x) => ({ kind: "expense", date: x.date, ts: x.createdAt, x })),
    ...g.settlements.map((x) => ({ kind: "payment", date: x.date, ts: x.createdAt, x })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);

  if (!items.length) return h("p", { class: "muted center" }, "No expenses yet. Add the first one!");

  const money = (c) => fmt(c, g.currency);

  return h("ul", { class: "list" }, items.map((it) => {
    if (it.kind === "payment") {
      const s = it.x;
      return h("li", { class: `item payment ${s.deleted ? "deleted" : ""}` },
        h("div", { class: "icon-cell" }, "🤝"),
        h("div", { class: "grow" },
          h("strong", {}, `${nameOf(g, s.from)} paid ${nameOf(g, s.to)}`),
          h("div", { class: "muted small" }, fmtDate(s.date))),
        h("div", { class: "amount" }, money(s.amount)),
        h("button", { class: "link", onclick: () => attempt(() => setSettlementDeleted(g.id, s.id, !s.deleted, meId)) }, s.deleted ? "Restore" : "✕"));
    }

    const e = it.x;
    const diff = (e.payers[meId] ?? 0) - (e.owed[meId] ?? 0);
    const involved = meId in e.payers || meId in e.owed;
    const payerText = Object.keys(e.payers).map((id) => nameOf(g, id)).join(", ");
    return h("li", {
      class: `item ${e.deleted ? "deleted" : ""}`,
      onclick: (ev) => { if (!e.deleted && !ev.target.closest("button")) openExpenseForm(g, meId, e); },
    },
      h("div", { class: "icon-cell" }, categoryOf(e.category).icon),
      h("div", { class: "grow" },
        h("strong", {}, e.desc),
        h("div", { class: "muted small" }, `${fmtDate(e.date)} · ${payerText} paid ${money(e.amount)}`)),
      e.deleted
        ? h("button", { class: "link", onclick: () => attempt(() => setExpenseDeleted(g.id, e.id, false, meId)) }, "Restore")
        : h("div", { class: `amount ${diff > 0 ? "pos" : diff < 0 ? "neg" : ""}` },
            involved ? (diff > 0 ? `you lent ${money(diff)}` : diff < 0 ? `you owe ${money(-diff)}` : "settled") : "not involved"));
  }));
}
