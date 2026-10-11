import { h, option } from "./dom.js";
import { openModal } from "./modal.js";
import { attempt } from "./toast.js";
import { toCents, toInputString } from "../core/money.js";
import { today } from "../core/dates.js";
import { recordSettlement } from "../features/settle.js";
import { activeMembers } from "../features/members.js";

// preset = { from, to, amount } (cents) to pre-fill from a suggested debt.
export function openSettleForm(group, meId, preset = {}) {
  const members = activeMembers(group);
  const s = {
    from: preset.from ?? meId ?? members[0].id,
    to: preset.to ?? members.find((m) => m.id !== (preset.from ?? meId))?.id ?? members[0].id,
    amount: preset.amount ? toInputString(preset.amount) : "",
    date: today(),
  };
  const pick = (key) => (e) => (s[key] = e.target.value);
  const select = (key) => h("select", { onchange: pick(key) }, members.map((m) => option(m.id, m.name, m.id === s[key])));

  const form = h("form", { class: "form" },
    h("div", { class: "row two" },
      h("label", { class: "field" }, h("span", {}, "Who paid"), select("from")),
      h("label", { class: "field" }, h("span", {}, "Paid to"), select("to"))),
    h("div", { class: "row two" },
      h("label", { class: "field" }, h("span", {}, `Amount (${group.currency})`),
        h("input", { type: "number", step: "0.01", min: "0", inputMode: "decimal", value: s.amount, oninput: pick("amount") })),
      h("label", { class: "field" }, h("span", {}, "Date"), h("input", { type: "date", value: s.date, onchange: pick("date") }))),
    h("div", { class: "row end" }, h("button", { type: "submit", class: "btn primary" }, "Record payment")),
  );

  const modal = openModal("Settle up", form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await attempt(() => recordSettlement(group.id, { from: s.from, to: s.to, amount: toCents(s.amount), date: s.date || today() }, meId));
    if (ok) modal.close();
  });
}
