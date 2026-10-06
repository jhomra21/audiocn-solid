import { render } from "@solidjs/web";

import { AudioDevicesApp } from "@/app/audio-devices";
import { AudioHooksApp } from "@/app/audio-hooks";
import { AudioPlayerApp } from "@/app/audio-player";
import { BlocksApp } from "@/app/blocks";
import { ContractApp } from "@/app/contracts";
import { ControlsApp } from "@/app/controls";
import { DemoRoutingApp } from "@/app/demo-routing";
import { App } from "@/app/gallery";
import { HooksLabApp } from "@/app/hooks-lab";
import { MetersApp } from "@/app/meters";
import { MixerMediaApp } from "@/app/mixer-media";
import { PaintersApp } from "@/app/painters";
import { PlaybackApp } from "@/app/playback";
import { PopoverApp } from "@/app/popover";
import { SoundPadsApp } from "@/app/sound-pads";
import { VisualizersApp } from "@/app/visualizers";
import { WaveformApp } from "@/app/waveform";
import { WebAudioMixerApp } from "@/app/web-audio-mixer";

import "../styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root");
}

const dispose = render(
  () =>
    location.pathname === "/controls" ? (
      <ControlsApp />
    ) : location.pathname === "/blocks" ? (
      <BlocksApp />
    ) : location.pathname === "/audio-devices" ? (
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
    ) : location.pathname === "/meters" ? (
      <MetersApp />
    ) : location.pathname === "/painters" ? (
      <PaintersApp />
    ) : location.pathname === "/demo-routing" ? (
      <DemoRoutingApp />
    ) : location.pathname === "/mixer-media" ? (
      <MixerMediaApp />
    ) : location.pathname === "/hooks-lab" ? (
      <HooksLabApp />
    ) : location.pathname === "/contracts" ? (
      <ContractApp />
    ) : (
      <App runtime="solid-2" />
    ),
  root
);

window.addEventListener("beforeunload", dispose, { once: true });
