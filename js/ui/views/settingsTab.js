import { h, option } from "../dom.js";
import { attempt, toast } from "../toast.js";
import { avatar } from "../avatar.js";
import { store } from "../../store/index.js";
import { activeMembers, addMember, removeMember, nameOf } from "../../features/members.js";
import { renameGroup, shareLink, forget, setMe, setReminders } from "../../features/groups.js";
import { openEmailForm } from "../emailForm.js";
import { exportCsv, exportJson, importJson } from "../../features/export.js";

export function settingsTab(g, { meId, rerender }) {
  const link = shareLink(g.id);
  const emailCount = activeMembers(g).filter((m) => m.email).length;
  const nameInput = h("input", { type: "text", value: g.name });
  const newMember = h("input", { type: "text", placeholder: "Add a friend by name" });
  const fileInput = h("input", { type: "file", accept: "application/json", hidden: true });
  fileInput.addEventListener("change", async () => {
    if (await attempt(() => importJson(fileInput.files[0]))) toast("Backup restored.");
  });

  return h("div", { class: "form" },
    h("h3", {}, "Invite friends"),
    store.mode === "local" && h("p", { class: "muted" }, "Local mode: this link only works on this device. Enable shared mode (README) so friends can open it."),
    h("div", { class: "row" },
      h("input", { type: "text", readOnly: true, value: link, onclick: (e) => e.target.select() }),
      h("button", { class: "btn", onclick: async () => { await navigator.clipboard?.writeText(link); toast("Link copied."); } }, "Copy")),

    h("h3", {}, "Group name"),
    h("div", { class: "row" }, nameInput,
      h("button", { class: "btn", onclick: () => attempt(() => renameGroup(g.id, nameInput.value, nameOf(g, meId))) }, "Rename")),

    h("h3", {}, "Members"),
    h("ul", { class: "list" }, activeMembers(g).map((m) => h("li", { class: "item" },
      avatar(m),
      h("div", { class: "grow" },
        h("div", {}, m.id === meId ? `${m.name} (you)` : m.name),
        h("div", { class: "muted small email" }, m.email ?? "No email")),
      h("button", { class: "link", onclick: () => openEmailForm(g, m, meId) }, m.email ? "Edit email" : "Add email"),
      h("button", { class: "link", onclick: () => confirm(`Remove ${m.name}?`) && attempt(() => removeMember(g.id, m.id, meId)) }, "Remove")))),
    h("div", { class: "row" }, newMember,
      h("button", { class: "btn", onclick: async () => { if (await attempt(() => addMember(g.id, newMember.value, meId))) newMember.value = ""; } }, "Add")),

    h("h3", {}, "Weekly reminders"),
    h("label", { class: "check" },
      h("input", { type: "checkbox", checked: !!g.reminders, onchange: (e) => attempt(() => setReminders(g.id, e.target.checked, nameOf(g, meId))) }),
      "Email members their balance every Friday morning"),
    h("p", { class: "muted small" },
      `${emailCount} of ${activeMembers(g).length} members have an email. Each email lists who they owe and who owes them; settled-up people get nothing. `,
      "Needs the reminder job set up (see README)."),

    h("h3", {}, "I am"),
    h("select", { onchange: (e) => { setMe(g.id, e.target.value); rerender(); } },
      activeMembers(g).map((m) => option(m.id, m.name, m.id === meId))),

    h("h3", {}, "Data"),
    h("div", { class: "row wrap" },
      h("button", { class: "btn", onclick: () => exportCsv(g) }, "Export CSV"),
      h("button", { class: "btn", onclick: () => exportJson(g) }, "Backup (JSON)"),
      h("button", { class: "btn", onclick: () => fileInput.click() }, "Restore backup"), fileInput),

    h("h3", {}, "Leave"),
    h("button", {
      class: "btn danger",
      onclick: () => {
        if (!confirm("Remove this group from this device? Others keep their copy; you can rejoin with the link.")) return;
        forget(g.id);
        location.hash = "#/";
      },
    }, "Forget group on this device"));
}
