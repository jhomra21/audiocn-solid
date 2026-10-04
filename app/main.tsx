import { render } from "solid-js/web";

import { ContractApp } from "@/app/contracts";
import { App } from "@/app/gallery";

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
