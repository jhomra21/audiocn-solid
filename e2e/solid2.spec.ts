import { runAudioDeviceSelectSuite } from "./audio-device-select-suite";
import { runAudioHooksSuite } from "./audio-hooks-suite";
import { runAudioPlayerSuite } from "./audio-player-suite";
import { runBlocksSuite } from "./blocks-suite";
import { runControlsSuite } from "./controls-suite";
import { runDemoRoutingSuite } from "./demo-routing-suite";
import { runHooksSuite } from "./hooks-suite";
import { runMetersSuite } from "./meters-suite";
import { runMixerMediaSuite } from "./mixer-media-suite";
import { runPaintersSuite } from "./painters-suite";
import { runParitySuite } from "./parity-suite";
import { runPlaybackSuite } from "./playback-suite";
import { runPopoverSuite } from "./popover-suite";
import { runSoundPadSuite } from "./sound-pad-suite";
import { runVisualizersSuite } from "./visualizers-suite";
import { runWaveformSuite } from "./waveform-suite";
import { runWebAudioMixerSuite } from "./web-audio-mixer-suite";

runAudioPlayerSuite("solid-2");

runBlocksSuite("solid-2");

runControlsSuite("solid-2");

runAudioDeviceSelectSuite("solid-2");

runSoundPadSuite("solid-2");

runWaveformSuite("solid-2");

runWebAudioMixerSuite("solid-2");

runPlaybackSuite("solid-2");

runVisualizersSuite("solid-2");

runMetersSuite("solid-2");

runPaintersSuite();

runHooksSuite();

runMixerMediaSuite();

runDemoRoutingSuite();

runPopoverSuite("solid-2");

runAudioHooksSuite("solid-2");

runParitySuite({
  artifactDir: "test-results/solid2-artifacts",
  runtime: "solid-2",
});
