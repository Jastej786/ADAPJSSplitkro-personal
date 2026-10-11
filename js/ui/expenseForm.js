import { h, option } from "./dom.js";
import { openModal } from "./modal.js";
import { attempt, toast } from "./toast.js";
import { categories } from "../core/categories.js";
import { computeOwed, validatePayers } from "../core/splits.js";
import { toCents, toInputString, fmt } from "../core/money.js";
import { today } from "../core/dates.js";
import { saveExpense, setExpenseDeleted } from "../features/expenses.js";

const SPLIT_TYPES = [
  { id: "equal", label: "Equally" },
  { id: "exact", label: "Exact amounts" },
  { id: "percent", label: "Percentages" },
  { id: "shares", label: "Shares" },
];
const UNIT = { exact: "", percent: "%", shares: "shares" };

// Add (existing = null) or edit an expense.
export function openExpenseForm(group, meId, existing = null) {
  const involved = new Set(existing ? [...Object.keys(existing.payers), ...Object.keys(existing.owed)] : []);
  const members = group.members.filter((m) => !m.left || involved.has(m.id));
  const payerIds = existing ? Object.keys(existing.payers) : [];

  const s = {
    desc: existing?.desc ?? "",
    amount: existing ? toInputString(existing.amount) : "",
    date: existing?.date ?? today(),
    category: existing?.category ?? "general",
    payerMode: payerIds.length > 1 ? "multi" : "single",
    payer: payerIds[0] ?? (members.some((m) => m.id === meId) ? meId : members[0].id),
    payerAmts: Object.fromEntries(Object.entries(existing?.payers ?? {}).map(([id, c]) => [id, toInputString(c)])),
    type: existing?.splitType ?? "equal",
    included: new Set(existing ? Object.keys(existing.owed) : members.filter((m) => !m.left).map((m) => m.id)),
    vals: { ...(existing?.splitVals ?? {}) },
  };

  const form = h("form", { class: "form", novalidate: true });
  const hint = h("p", { class: "hint" });
  let modal;

  // Recompute per-person previews and the validation hint (no re-render, so typing keeps focus).
  function refreshHints() {
    const total = toCents(s.amount);
    let msg = "";
    const res = computeOwed(total, s.type, [...s.included], s.vals);
    form.querySelectorAll("[data-share]").forEach((el) => {
      const c = res.owed?.[el.dataset.share];
      el.textContent = c == null ? "" : fmt(c, group.currency);
    });
    if (s.payerMode === "multi" && total > 0) {
      msg = validatePayers(total, parsePayers()) ?? "";
    }
    hint.textContent = msg || (res.error && total > 0 ? res.error : "");
    hint.classList.toggle("bad", !!hint.textContent);
  }

  function parsePayers() {
    if (s.payerMode === "single") return { [s.payer]: toCents(s.amount) };
    const out = {};
    for (const m of members) {
      const c = toCents(s.payerAmts[m.id] || 0);
      if (c > 0) out[m.id] = c;
    }
    return out;
  }

  const field = (label, control) => h("label", { class: "field" }, h("span", {}, label), control);

  function payerSection() {
    if (s.payerMode === "single") {
      return h("div", { class: "field" },
        h("span", {}, "Paid by"),
        h("div", { class: "row" },
          h("select", { onchange: (e) => (s.payer = e.target.value) },
            members.map((m) => option(m.id, m.id === meId ? `${m.name} (you)` : m.name, m.id === s.payer))),
          h("button", { type: "button", class: "link", onclick: () => { s.payerMode = "multi"; draw(); } }, "Multiple people"),
        ));
    }
    return h("div", { class: "field" },
      h("span", {}, "Paid by (amount each)"),
      members.map((m) => h("div", { class: "row person" },
        h("span", { class: "grow" }, m.name),
        h("input", {
          type: "number", step: "0.01", min: "0", inputMode: "decimal", placeholder: "0.00",
          value: s.payerAmts[m.id] ?? "",
          oninput: (e) => { s.payerAmts[m.id] = e.target.value; refreshHints(); },
        }))),
      h("button", { type: "button", class: "link", onclick: () => { s.payerMode = "single"; draw(); } }, "One person paid"));
  }

  function splitSection() {
    return h("div", { class: "field" },
      h("span", {}, "Split"),
      h("div", { class: "seg" }, SPLIT_TYPES.map((t) =>
        h("button", {
          type: "button", class: t.id === s.type ? "on" : "",
          onclick: () => { s.type = t.id; draw(); },
        }, t.label))),
      members.map((m) => {
        const on = s.included.has(m.id);
        return h("div", { class: "row person" },
          h("input", {
            type: "checkbox", checked: on, "aria-label": `Include ${m.name}`,
            onchange: (e) => { e.target.checked ? s.included.add(m.id) : s.included.delete(m.id); draw(); },
          }),
          h("span", { class: "grow" }, m.name),
          s.type !== "equal" && on && h("input", {
            type: "number", step: "any", min: "0", inputMode: "decimal", class: "narrow",
            placeholder: s.type === "shares" ? "1" : "0", value: s.vals[m.id] ?? "",
            oninput: (e) => { s.vals[m.id] = e.target.value; refreshHints(); },
          }),
          s.type !== "equal" && on && h("span", { class: "unit" }, UNIT[s.type]),
          h("span", { class: "share", "data-share": m.id }),
        );
      }));
  }

  function draw() {
    form.replaceChildren(
      field("Description", h("input", { type: "text", value: s.desc, placeholder: "Dinner, cab, rent…", required: true, oninput: (e) => (s.desc = e.target.value) })),
      h("div", { class: "row two" },
        field(`Amount (${group.currency})`, h("input", {
          type: "number", step: "0.01", min: "0", inputMode: "decimal", placeholder: "0.00", value: s.amount,
          oninput: (e) => { s.amount = e.target.value; refreshHints(); },
        })),
        field("Date", h("input", { type: "date", value: s.date, onchange: (e) => (s.date = e.target.value) }))),
      field("Category", h("select", { onchange: (e) => (s.category = e.target.value) },
        categories.map((c) => option(c.id, `${c.icon} ${c.label}`, c.id === s.category)))),
      payerSection(),
      splitSection(),
      hint,
      h("div", { class: "row end" },
        existing && h("button", {
          type: "button", class: "btn danger",
          onclick: async () => { if (await attempt(() => setExpenseDeleted(group.id, existing.id, true, meId))) modal.close(); },
        }, "Delete"),
        h("button", { type: "submit", class: "btn primary" }, existing ? "Save" : "Add expense")),
    );
    refreshHints();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const total = toCents(s.amount);
    const desc = s.desc.trim();
    if (!desc) return toast("Add a description.", "error");
    if (!(total > 0)) return toast("Enter an amount greater than zero.", "error");

    const payers = parsePayers();
    const payerErr = validatePayers(total, payers);
    if (payerErr) return toast(payerErr, "error");

    const ids = [...s.included];
    const res = computeOwed(total, s.type, ids, s.vals);
    if (res.error) return toast(res.error, "error");

    const ok = await attempt(() => saveExpense(group.id, {
      id: existing?.id, desc, amount: total, category: s.category, date: s.date || today(),
      payers, splitType: s.type,
      splitVals: s.type === "equal" ? null : Object.fromEntries(ids.map((id) => [id, s.vals[id] ?? ""])),
      owed: res.owed,
    }, meId));
    if (ok) modal.close();
  });

  draw();
  modal = openModal(existing ? "Edit expense" : "Add an expense", form);
}
