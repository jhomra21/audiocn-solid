import { render } from "@solidjs/web";

import { App } from "@/src/app";
import { ContractApp } from "@/src/contracts";
import "../src/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

const dispose = render(
  () =>
    location.pathname === "/contracts" ? (
      <ContractApp />
    ) : (
      <App runtime="solid-2" />
    ),
  root
);

window.addEventListener("beforeunload", dispose, { once: true });
