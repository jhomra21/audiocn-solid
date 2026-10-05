import { runAudioHooksSuite } from "./audio-hooks-suite";
import { runParitySuite } from "./parity-suite";
import { runPlaybackSuite } from "./playback-suite";
import { runPopoverSuite } from "./popover-suite";
import { runVisualizersSuite } from "./visualizers-suite";
import { runWebAudioMixerSuite } from "./web-audio-mixer-suite";

runWebAudioMixerSuite("solid-2");

runPlaybackSuite("solid-2");

runVisualizersSuite("solid-2");

runPopoverSuite("solid-2");

runAudioHooksSuite("solid-2");

runParitySuite({
  artifactDir: "test-results/solid2-artifacts",
  runtime: "solid-2",
});
