import { render } from "solid-js/web";

import { App } from "@/src/app";
import { ContractApp } from "@/src/contracts";
import "@/src/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

render(
  () =>
    location.pathname === "/contracts" ? (
      <ContractApp />
    ) : (
      <App runtime="solid-1" />
    ),
  root
);
