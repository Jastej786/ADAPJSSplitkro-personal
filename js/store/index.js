import { config } from "../config.js";
import { localStore } from "./local.js";
import { firebaseStore } from "./firebase.js";

// Dev aid: open the site with ?local to use browser storage even when Firebase is configured,
// so you can try things out without touching the shared database.
const forceLocal = new URLSearchParams(location.search).has("local");

export const store = config.firebase && !forceLocal ? firebaseStore : localStore;
