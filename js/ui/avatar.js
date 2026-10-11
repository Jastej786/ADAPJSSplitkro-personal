import { h } from "./dom.js";

// Initial in a soft tint of one of the palette hues. Keyed on member id so renames keep the colour.
export function avatar(member, size = "") {
  let hash = 0;
  for (const ch of member.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const initial = (member.name.trim()[0] ?? "?").toUpperCase();
  return h("span", { class: `avatar ${size}`, style: `--tint: var(--c${(hash % 8) + 1})`, title: member.name }, initial);
}

export const avatarStack = (members) => h("div", { class: "avatars" }, members.slice(0, 6).map((m) => avatar(m, "sm")),
  members.length > 6 && h("span", { class: "avatar sm more" }, `+${members.length - 6}`));
