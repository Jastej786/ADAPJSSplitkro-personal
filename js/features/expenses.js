import { store } from "../store/index.js";
import { uid } from "../core/id.js";
import { fmt } from "../core/money.js";
import { logActivity } from "./activity.js";
import { nameOf } from "./members.js";

// data: { id?, desc, amount, category, date, payers, splitType, splitVals, owed } (amounts in cents)
export async function saveExpense(groupId, data, actorId) {
  await store.update(groupId, (g) => {
    const who = nameOf(g, actorId);
    const fields = {
      desc: data.desc, amount: data.amount, category: data.category, date: data.date,
      payers: data.payers, splitType: data.splitType, splitVals: data.splitVals, owed: data.owed,
    };
    const existing = data.id && g.expenses.find((e) => e.id === data.id);
    if (existing) {
      Object.assign(existing, fields, { updatedAt: Date.now() });
      logActivity(g, `${who} edited "${data.desc}" (${fmt(data.amount, g.currency)}).`);
    } else {
      g.expenses.push({ id: uid(), ...fields, createdBy: actorId, createdAt: Date.now() });
      logActivity(g, `${who} added "${data.desc}" (${fmt(data.amount, g.currency)}).`);
    }
  });
}

// Soft delete so it can be restored (and the history stays honest).
export async function setExpenseDeleted(groupId, expenseId, deleted, actorId) {
  await store.update(groupId, (g) => {
    const e = g.expenses.find((x) => x.id === expenseId);
    e.deleted = deleted;
    logActivity(g, `${nameOf(g, actorId)} ${deleted ? "deleted" : "restored"} "${e.desc}".`);
  });
}
