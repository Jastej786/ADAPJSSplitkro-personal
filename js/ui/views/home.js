import { h, option } from "../dom.js";
import { attempt } from "../toast.js";
import { config } from "../../config.js";
import { store } from "../../store/index.js";
import { createGroup, joinGroup, getJoined } from "../../features/groups.js";

export function renderHome(root) {
  const banner = store.mode === "local"
    ? h("div", { class: "banner" }, "Local mode: groups are saved only in this browser. See README to enable sharing with friends.")
    : null;

  const f = { name: "", currency: config.defaultCurrency, yourName: "", others: "" };
  const bind = (k) => (e) => (f[k] = e.target.value);

  const createForm = h("form", { class: "card form" },
    h("h2", {}, "Start a group"),
    h("label", { class: "field" }, h("span", {}, "Group name"), h("input", { type: "text", placeholder: "Goa trip, Flat 4B…", oninput: bind("name") })),
    h("div", { class: "row two" },
      h("label", { class: "field" }, h("span", {}, "Your name"), h("input", { type: "text", oninput: bind("yourName") })),
      h("label", { class: "field" }, h("span", {}, "Currency"),
        h("select", { onchange: bind("currency") }, config.currencies.map((c) => option(c, c, c === f.currency))))),
    h("label", { class: "field" }, h("span", {}, "Friends (comma separated, optional)"),
      h("input", { type: "text", placeholder: "Asha, Ravi, Meera", oninput: bind("others") })),
    h("button", { type: "submit", class: "btn primary" }, "Create group"),
  );
  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let g;
    const ok = await attempt(async () => {
      g = await createGroup({ name: f.name, currency: f.currency, yourName: f.yourName, otherNames: f.others.split(",") });
    });
    if (ok) location.hash = `#/g/${g.id}`;
  });

  const joinInput = h("input", { type: "text", placeholder: "Paste a share link or code" });
  const joinForm = h("form", { class: "card form" },
    h("h2", {}, "Join a friend's group"),
    h("div", { class: "row" }, joinInput, h("button", { type: "submit", class: "btn" }, "Join")),
  );
  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    let g;
    if (await attempt(async () => { g = await joinGroup(joinInput.value); })) location.hash = `#/g/${g.id}`;
  });

  const joined = getJoined();
  const list = h("div", { class: "card" },
    h("h2", {}, "Your groups"),
    joined.length
      ? h("ul", { class: "list" }, joined.map((g) => h("li", {}, h("a", { href: `#/g/${g.id}` }, g.name))))
      : h("p", { class: "muted" }, "No groups yet. Create one or join with a link."));

  root.replaceChildren(banner, list, createForm, joinForm);
}
