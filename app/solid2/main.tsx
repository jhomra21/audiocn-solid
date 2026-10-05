import { render } from "@solidjs/web";

import { AudioHooksApp } from "@/app/audio-hooks";
import { ContractApp } from "@/app/contracts";
import { App } from "@/app/gallery";
import { PlaybackApp } from "@/app/playback";
import { PopoverApp } from "@/app/popover";
import { VisualizersApp } from "@/app/visualizers";
import { WebAudioMixerApp } from "@/app/web-audio-mixer";

import "../styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

const dispose = render(
  () =>
    location.pathname === "/web-audio-mixer" ? (
      <WebAudioMixerApp />
    ) : location.pathname === "/playback" ? (
      <PlaybackApp />
    ) : location.pathname === "/popover" ? (
      <PopoverApp />
    ) : location.pathname === "/visualizers" ? (
      <VisualizersApp />
    ) : location.pathname === "/audio-hooks" ? (
      <AudioHooksApp />
    ) : location.pathname === "/contracts" ? (
      <ContractApp />
    ) : (
      <App runtime="solid-2" />
    ),
  root
);

window.addEventListener("beforeunload", dispose, { once: true });
