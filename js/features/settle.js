import { store } from "../store/index.js";
import { uid } from "../core/id.js";
import { fmt } from "../core/money.js";
import { logActivity } from "./activity.js";
import { nameOf } from "./members.js";

// Records "from paid to" (amount in cents).
export async function recordSettlement(groupId, { from, to, amount, date }, actorId) {
  if (from === to) throw new Error("Pick two different people.");
  if (!(amount > 0)) throw new Error("Enter an amount greater than zero.");
  await store.update(groupId, (g) => {
    g.settlements.push({ id: uid(), from, to, amount, date, createdAt: Date.now() });
    logActivity(g, `${nameOf(g, actorId)} recorded: ${nameOf(g, from)} paid ${nameOf(g, to)} ${fmt(amount, g.currency)}.`);
  });
}

export async function setSettlementDeleted(groupId, settlementId, deleted, actorId) {
  await store.update(groupId, (g) => {
    const s = g.settlements.find((x) => x.id === settlementId);
    s.deleted = deleted;
    logActivity(g, `${nameOf(g, actorId)} ${deleted ? "deleted" : "restored"} a payment of ${fmt(s.amount, g.currency)}.`);
  });
}
