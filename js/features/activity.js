import { uid } from "../core/id.js";

const MAX_ENTRIES = 300;

// Call inside a store.update() mutator.
export function logActivity(group, text) {
  group.activity ??= [];
  group.activity.unshift({ id: uid(), ts: Date.now(), text });
  group.activity.length = Math.min(group.activity.length, MAX_ENTRIES);
}
