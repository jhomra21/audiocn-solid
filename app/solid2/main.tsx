import { render } from "@solidjs/web";

import { ContractApp } from "@/app/contracts";
import { App } from "@/app/gallery";

import "../styles.css";

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
