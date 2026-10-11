import { h } from "../dom.js";
import { openExpenseForm } from "../expenseForm.js";
import { openSettleForm } from "../settleForm.js";
import { openWhoAmI } from "../whoAmI.js";
import { avatarStack } from "../avatar.js";
import { expensesTab } from "./expensesTab.js";
import { balancesTab } from "./balancesTab.js";
import { insightsTab } from "./insightsTab.js";
import { activityTab } from "./activityTab.js";
import { settingsTab } from "./settingsTab.js";
import { fmt } from "../../core/money.js";
import { netBalances } from "../../core/balances.js";
import { store } from "../../store/index.js";
import { getMe, remember } from "../../features/groups.js";
import { activeMembers } from "../../features/members.js";

const TABS = [
  { id: "expenses", label: "Expenses", render: expensesTab },
  { id: "balances", label: "Balances", render: balancesTab },
  { id: "insights", label: "Insights", render: insightsTab },
  { id: "activity", label: "Activity", render: activityTab },
  { id: "settings", label: "Settings", render: settingsTab },
];

// Renders a live group page; returns a cleanup function for the router.
export function renderGroup(root, id, tabId = "expenses") {
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  let group = null;
  let asking = false;

  const rerender = () => group && draw(group);

  function draw(g) {
    remember(g);
    let meId = getMe(g.id);
    if (meId && !g.members.some((m) => m.id === meId)) meId = null;
    if (!meId && !asking) {
      asking = true;
      openWhoAmI(g, () => { asking = false; rerender(); });
    }

    const mine = netBalances(g)[meId] ?? 0;
    const tone = mine > 0 ? "pos" : mine < 0 ? "neg" : "";
    const headline = !meId ? "" : mine > 0 ? "You are owed" : mine < 0 ? "You owe" : "You are all settled up";
    const members = activeMembers(g);

    root.replaceChildren(
      h("a", { href: "#/", class: "back" }, "← All groups"),
      h("div", { class: "card hero" },
        h("div", { class: "hero-main" },
          h("div", { class: "eyebrow" }, `${g.currency} · ${members.length} ${members.length === 1 ? "person" : "people"}`),
          h("h1", {}, g.name),
          avatarStack(members)),
        h("div", { class: `hero-balance ${tone}` },
          h("div", { class: "hero-label" }, headline),
          mine !== 0 && h("div", { class: "hero-num" }, fmt(Math.abs(mine), g.currency))),
        h("div", { class: "hero-actions" },
          h("button", { class: "btn primary", onclick: () => openExpenseForm(g, meId) }, "+ Add expense"),
          h("button", { class: "btn", onclick: () => openSettleForm(g, meId) }, "Settle up"))),
      h("nav", { class: "tabs" }, TABS.map((t) =>
        h("a", { href: `#/g/${g.id}/${t.id}`, class: t.id === tab.id ? "on" : "" }, t.label))),
      h("div", { class: "card panel" }, tab.render(g, { meId, rerender })),
    );
  }

  const unsub = store.subscribe(id, (g) => {
    group = g;
    if (!g) root.replaceChildren(h("div", { class: "card" }, h("p", {}, "Group not found."), h("a", { href: "#/" }, "Back home")));
    else draw(g);
  });
  return unsub;
}
