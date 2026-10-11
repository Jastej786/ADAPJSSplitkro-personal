import { renderHome } from "./ui/views/home.js";
import { renderGroup } from "./ui/views/group.js";

// Hash routes: #/  and  #/g/<groupId>[/<tab>]
export function startRouter(root) {
  let cleanup = null;

  function route() {
    cleanup?.();
    cleanup = null;
    window.scrollTo(0, 0);
    const [, section, id, tab] = location.hash.replace(/^#/, "").split("/");
    if (section === "g" && id) cleanup = renderGroup(root, id, tab);
    else renderHome(root);
  }

  window.addEventListener("hashchange", route);
  route();
}
