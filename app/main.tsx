import { render } from "solid-js/web";

import { AudioDevicesApp } from "@/app/audio-devices";
import { AudioHooksApp } from "@/app/audio-hooks";
import { AudioPlayerApp } from "@/app/audio-player";
import { ContractApp } from "@/app/contracts";
import { App } from "@/app/gallery";
import { PlaybackApp } from "@/app/playback";
import { PopoverApp } from "@/app/popover";
import { SoundPadsApp } from "@/app/sound-pads";
import { VisualizersApp } from "@/app/visualizers";
import { WaveformApp } from "@/app/waveform";
import { WebAudioMixerApp } from "@/app/web-audio-mixer";

import "@/app/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

render(
  () =>
    location.pathname === "/audio-devices" ? (
      <AudioDevicesApp />
    ) : location.pathname === "/audio-player" ? (
      <AudioPlayerApp />
    ) : location.pathname === "/sound-pads" ? (
      <SoundPadsApp />
    ) : location.pathname === "/waveform" ? (
      <WaveformApp />
    ) : location.pathname === "/web-audio-mixer" ? (
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
      <App runtime="solid-1" />
    ),
  root
);
