import { h } from "./dom.js";
import { openModal } from "./modal.js";
import { attempt, toast } from "./toast.js";
import { setMemberEmail } from "../features/members.js";

export function openEmailForm(group, member, meId) {
  const input = h("input", { type: "email", value: member.email ?? "", placeholder: "name@example.com", autocomplete: "off" });
  const form = h("form", { class: "form" },
    h("p", { class: "muted small" }, "Used only for the weekly \"you owe\" reminder. Anyone with the group link can see this address."),
    h("label", { class: "field" }, h("span", {}, `Email for ${member.name}`), input),
    h("div", { class: "row end" },
      member.email && h("button", { type: "button", class: "btn danger", onclick: async () => { if (await attempt(() => setMemberEmail(group.id, member.id, "", meId))) { toast("Email removed."); modal.close(); } } }, "Remove"),
      h("button", { type: "submit", class: "btn primary" }, "Save")));

  const modal = openModal("Reminder email", form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (await attempt(() => setMemberEmail(group.id, member.id, input.value, meId))) { toast("Email saved."); modal.close(); }
  });
  input.focus();
}
