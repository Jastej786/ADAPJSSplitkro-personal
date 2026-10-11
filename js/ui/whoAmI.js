import { h } from "./dom.js";
import { openModal } from "./modal.js";
import { attempt } from "./toast.js";
import { setMe } from "../features/groups.js";
import { addMember, activeMembers } from "../features/members.js";

// Asked once per device per group, so "you owe" / "you are owed" make sense.
export function openWhoAmI(group, onDone) {
  const name = h("input", { type: "text", placeholder: "Your name" });
  const choose = (id) => { setMe(group.id, id); modal.close(); onDone(); };

  const body = h("div", { class: "form" },
    h("p", { class: "muted" }, "Which one are you in this group?"),
    activeMembers(group).map((m) => h("button", { type: "button", class: "btn block", onclick: () => choose(m.id) }, m.name)),
    h("p", { class: "muted" }, "Not listed? Add yourself:"),
    h("div", { class: "row" }, name,
      h("button", {
        type: "button", class: "btn primary",
        onclick: async () => {
          let created;
          if (await attempt(async () => { created = await addMember(group.id, name.value, null); })) choose(created.id);
        },
      }, "Join")),
  );
  const modal = openModal(`Welcome to ${group.name}`, body);
}
