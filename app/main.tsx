import { render } from "solid-js/web";

import { App } from "@/app/gallery";
import { ContractApp } from "@/app/contracts";
import "@/app/styles.css";

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
