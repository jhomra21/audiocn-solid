import { runAudioHooksSuite } from "./audio-hooks-suite";
import { runParitySuite } from "./parity-suite";
import { runPopoverSuite } from "./popover-suite";
import { runVisualizersSuite } from "./visualizers-suite";

runVisualizersSuite("solid-2");

runPopoverSuite("solid-2");

runAudioHooksSuite("solid-2");

runParitySuite({
  artifactDir: "test-results/solid2-artifacts",
  runtime: "solid-2",
});
