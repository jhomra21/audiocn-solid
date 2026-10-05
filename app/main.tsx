import { render } from "solid-js/web";

import { AudioHooksApp } from "@/app/audio-hooks";
import { ContractApp } from "@/app/contracts";
import { App } from "@/app/gallery";
import { PopoverApp } from "@/app/popover";
import { VisualizersApp } from "@/app/visualizers";

import "@/app/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

render(
  () =>
    location.pathname === "/popover" ? (
      <PopoverApp />
    ) : location.pathname === "/visualizers" ? (
      <VisualizersApp />
    ) : location.pathname === "/audio-hooks" ? (
      <AudioHooksApp />
    ) : location.pathname === "/contracts" ? (
      <ContractApp />
    ) : (
      <App runtime="solid-1" />
    ),
  root
);
