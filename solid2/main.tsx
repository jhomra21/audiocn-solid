import { render } from "@solidjs/web";

import { App } from "@/src/app";
import "../src/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

const dispose = render(() => <App runtime="solid-2" />, root);

window.addEventListener("beforeunload", dispose, { once: true });
