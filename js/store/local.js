// LOCAL MODE: groups live in this browser's localStorage.
// Store interface (shared with firebase.js): mode, get, create, update, subscribe.
const key = (id) => `splitapp:group:${id}`;
const listeners = new Map(); // groupId -> Set<callback>

const read = (id) => {
  const raw = localStorage.getItem(key(id));
  return raw ? JSON.parse(raw) : null;
};

const notify = (id) => {
  const g = read(id);
  listeners.get(id)?.forEach((cb) => cb(g));
};

window.addEventListener("storage", (e) => {
  if (e.key?.startsWith("splitapp:group:")) notify(e.key.slice("splitapp:group:".length));
});

export const localStore = {
  mode: "local",

  async get(id) {
    return read(id);
  },

  async create(group) {
    localStorage.setItem(key(group.id), JSON.stringify(group));
    notify(group.id);
  },

  // `mutate` edits the group in place. Returns the saved group.
  async update(id, mutate) {
    const g = read(id);
    if (!g) throw new Error("Group not found.");
    mutate(g);
    g.updatedAt = Date.now();
    localStorage.setItem(key(id), JSON.stringify(g));
    notify(id);
    return g;
  },

  subscribe(id, cb) {
    if (!listeners.has(id)) listeners.set(id, new Set());
    listeners.get(id).add(cb);
    cb(read(id));
    return () => listeners.get(id).delete(cb);
  },
};
