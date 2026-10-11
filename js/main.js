import { config } from "./config.js";
import { startRouter } from "./router.js";

document.title = config.appName;
document.querySelector("#app-name").textContent = config.appName;
startRouter(document.querySelector("#app"));
