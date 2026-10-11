import { config } from "../config.js";
import { localStore } from "./local.js";
import { firebaseStore } from "./firebase.js";

export const store = config.firebase ? firebaseStore : localStore;
