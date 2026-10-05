import { runAudioHooksSuite } from "./audio-hooks-suite";
import { runParitySuite } from "./parity-suite";
import { runPopoverSuite } from "./popover-suite";
import { runVisualizersSuite } from "./visualizers-suite";

runVisualizersSuite("solid-1");

runPopoverSuite("solid-1");

runAudioHooksSuite("solid-1");

runParitySuite({
  artifactDir: "test-results/artifacts",
  runtime: "solid-1",
});
