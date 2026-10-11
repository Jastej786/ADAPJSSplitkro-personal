import { h } from "../dom.js";
import { openSettleForm } from "../settleForm.js";
import { avatar } from "../avatar.js";
import { attempt } from "../toast.js";
import { fmt } from "../../core/money.js";
import { netBalances, debtsFor } from "../../core/balances.js";
import { nameOf } from "../../features/members.js";
import { setSimplify } from "../../features/groups.js";

export function balancesTab(g, { meId }) {
  const money = (c) => fmt(c, g.currency);
  const net = netBalances(g);
  const debts = debtsFor(g);
  const members = g.members.filter((m) => !m.left || net[m.id] !== 0);
  const maxAbs = Math.max(1, ...Object.values(net).map(Math.abs));
  const byId = Object.fromEntries(g.members.map((m) => [m.id, m]));

  const balanceRows = members.map((m) => {
    const v = net[m.id] ?? 0;
    return h("li", { class: "item" },
      avatar(m),
      h("div", { class: "grow" },
        h("strong", {}, m.id === meId ? `${m.name} (you)` : m.name),
        h("div", { class: "bar" }, h("i", { class: v >= 0 ? "pos" : "neg", style: `width:${(Math.abs(v) / maxAbs) * 100}%` }))),
      h("div", { class: `amount-col ${v > 0 ? "pos" : v < 0 ? "neg" : ""}` },
        h("span", { class: "small" }, v > 0 ? "gets back" : v < 0 ? "owes" : "settled up"),
        v !== 0 && h("strong", {}, money(Math.abs(v)))));
  });

  const debtRows = debts.length
    ? debts.map((d) => h("li", { class: "item" },
        avatar(byId[d.from]),
        h("div", { class: "grow" },
          h("strong", {}, `${nameOf(g, d.from)} owes ${nameOf(g, d.to)}`),
          h("div", { class: "muted small" }, money(d.amount))),
        h("button", { class: "btn small", onclick: () => openSettleForm(g, meId, d) }, "Settle")))
    : [h("li", { class: "muted center" }, "Everyone is settled up 🎉")];

  return h("div", {},
    h("h3", {}, "Balances"), h("ul", { class: "list" }, balanceRows),
    h("div", { class: "row between" },
      h("h3", {}, "Who owes whom"),
      h("label", { class: "check" },
        h("input", { type: "checkbox", checked: g.simplify !== false, onchange: (e) => attempt(() => setSimplify(g.id, e.target.checked)) }),
        "Simplify debts")),
    h("ul", { class: "list" }, debtRows));
}
