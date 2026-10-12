import { store } from "../store/index.js";
import { groupId, uid } from "../core/id.js";
import { logActivity } from "./activity.js";

const JOINED = "splitapp:joined"; // [{id, name}] groups this device knows about
const ME = "splitapp:me";         // { groupId: memberId } who "I" am in each group

const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export const getJoined = () => load(JOINED, []);
export const getMe = (gid) => load(ME, {})[gid] ?? null;
export const setMe = (gid, memberId) => save(ME, { ...load(ME, {}), [gid]: memberId });

export function remember(g) {
  const rest = getJoined().filter((x) => x.id !== g.id);
  save(JOINED, [{ id: g.id, name: g.name }, ...rest]);
}

export function forget(gid) {
  save(JOINED, getJoined().filter((x) => x.id !== gid));
  const me = load(ME, {});
  delete me[gid];
  save(ME, me);
}

export async function createGroup({ name, currency, yourName, otherNames }) {
  name = name.trim();
  yourName = yourName.trim();
  if (!name) throw new Error("Give the group a name.");
  if (!yourName) throw new Error("Enter your name.");

  const me = { id: uid(8), name: yourName };
  const others = otherNames.map((n) => n.trim()).filter(Boolean).map((n) => ({ id: uid(8), name: n }));
  const g = {
    id: groupId(), name, currency, simplify: true,
    members: [me, ...others], expenses: [], settlements: [], activity: [],
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  logActivity(g, `${yourName} created the group "${name}".`);
  await store.create(g);
  remember(g);
  setMe(g.id, me.id);
  return g;
}

// Accepts a bare id or a full share link.
export const parseGroupRef = (text) => (text.match(/#\/g\/([a-z0-9]+)/i)?.[1] ?? text.trim());

export async function joinGroup(ref) {
  const g = await store.get(parseGroupRef(ref));
  if (!g) throw new Error("No group found with that link or code.");
  remember(g);
  return g;
}

export async function renameGroup(gid, name, actorName) {
  name = name.trim();
  if (!name) throw new Error("Give the group a name.");
  const g = await store.update(gid, (x) => {
    x.name = name;
    logActivity(x, `${actorName} renamed the group to "${name}".`);
  });
  remember(g);
}

export async function setSimplify(gid, on) {
  await store.update(gid, (g) => { g.simplify = on; });
}

// Opt the group in/out of the Friday email reminders (sent by the GitHub Actions job in reminders/).
export async function setReminders(gid, on, actorName) {
  await store.update(gid, (g) => {
    g.reminders = on;
    logActivity(g, `${actorName} turned weekly email reminders ${on ? "on" : "off"}.`);
  });
}

export const shareLink = (gid) => `${location.origin}${location.pathname}#/g/${gid}`;
