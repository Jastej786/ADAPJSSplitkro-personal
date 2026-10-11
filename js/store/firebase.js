// SHARED MODE: one Firestore document per group (collection "groups").
// Firebase SDK is loaded from Google's CDN only when a config is provided.
import { config } from "../config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
let ready;

function init() {
  ready ??= (async () => {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    return { fs, db: fs.getFirestore(initializeApp(config.firebase)) };
  })();
  return ready;
}

// Firestore rejects `undefined`; a JSON round-trip strips it.
const clean = (g) => JSON.parse(JSON.stringify(g));

export const firebaseStore = {
  mode: "shared",

  async get(id) {
    const { fs, db } = await init();
    const snap = await fs.getDoc(fs.doc(db, "groups", id));
    return snap.exists() ? snap.data() : null;
  },

  async create(group) {
    const { fs, db } = await init();
    await fs.setDoc(fs.doc(db, "groups", group.id), clean(group));
  },

  // Transaction => two friends adding expenses at once never overwrite each other.
  async update(id, mutate) {
    const { fs, db } = await init();
    const ref = fs.doc(db, "groups", id);
    let saved;
    await fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Group not found.");
      const g = snap.data();
      mutate(g);
      g.updatedAt = Date.now();
      tx.set(ref, clean(g));
      saved = g;
    });
    return saved;
  },

  subscribe(id, cb) {
    let off = () => {};
    let cancelled = false;
    init().then(({ fs, db }) => {
      if (cancelled) return;
      off = fs.onSnapshot(fs.doc(db, "groups", id), (snap) => cb(snap.exists() ? snap.data() : null));
    });
    return () => { cancelled = true; off(); };
  },
};
