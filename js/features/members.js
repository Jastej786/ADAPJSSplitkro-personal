import { store } from "../store/index.js";
import { uid } from "../core/id.js";
import { netBalances } from "../core/balances.js";
import { normalizeEmail } from "../core/email.js";
import { logActivity } from "./activity.js";

export const nameOf = (g, id) => g.members.find((m) => m.id === id)?.name ?? "Unknown";
export const activeMembers = (g) => g.members.filter((m) => !m.left);

export async function addMember(groupId, name, actorId) {
  name = name.trim();
  if (!name) throw new Error("Enter a name.");
  let created;
  await store.update(groupId, (g) => {
    if (g.members.some((m) => !m.left && m.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`${name} is already in this group.`);
    }
    created = { id: uid(8), name };
    g.members.push(created);
    logActivity(g, actorId ? `${nameOf(g, actorId)} added ${name} to the group.` : `${name} joined the group.`);
  });
  return created;
}

// Like Splitwise: you can only remove someone who is settled up.
export async function removeMember(groupId, memberId, actorId) {
  await store.update(groupId, (g) => {
    if ((netBalances(g)[memberId] ?? 0) !== 0) throw new Error("Settle up with this person before removing them.");
    const m = g.members.find((x) => x.id === memberId);
    m.left = true;
    logActivity(g, `${nameOf(g, actorId)} removed ${m.name} from the group.`);
  });
}

// Used for weekly reminder emails. Empty string clears it.
export async function setMemberEmail(groupId, memberId, email, actorId) {
  const clean = normalizeEmail(email);
  if (clean === null) throw new Error("That doesn't look like a valid email address.");
  await store.update(groupId, (g) => {
    const m = g.members.find((x) => x.id === memberId);
    if (clean) m.email = clean; else delete m.email;
    logActivity(g, `${nameOf(g, actorId)} ${clean ? "set" : "cleared"} the reminder email for ${m.name}.`);
  });
}

export async function renameMember(groupId, memberId, name) {
  name = name.trim();
  if (!name) throw new Error("Enter a name.");
  await store.update(groupId, (g) => {
    g.members.find((m) => m.id === memberId).name = name;
  });
}
