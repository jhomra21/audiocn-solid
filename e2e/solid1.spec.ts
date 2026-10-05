import { runAudioHooksSuite } from "./audio-hooks-suite";
import { runParitySuite } from "./parity-suite";
import { runPlaybackSuite } from "./playback-suite";
import { runPopoverSuite } from "./popover-suite";
import { runVisualizersSuite } from "./visualizers-suite";
import { runWebAudioMixerSuite } from "./web-audio-mixer-suite";

runWebAudioMixerSuite("solid-1");

runPlaybackSuite("solid-1");

runVisualizersSuite("solid-1");

runPopoverSuite("solid-1");

runAudioHooksSuite("solid-1");

runParitySuite({
  artifactDir: "test-results/artifacts",
  runtime: "solid-1",
});
