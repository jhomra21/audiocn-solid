import { render } from "solid-js/web";

import { App } from "@/src/app";
import "@/src/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

render(() => <App />, root);
