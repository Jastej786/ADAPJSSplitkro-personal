import { config } from "./config.js";
import { startRouter } from "./router.js";
import { initTheme } from "./ui/theme.js";

document.title = config.appName;
document.querySelector("#app-name").textContent = config.appName;
initTheme(document.querySelector("#theme-toggle"));
startRouter(document.querySelector("#app"));
