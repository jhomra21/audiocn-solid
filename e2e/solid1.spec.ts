import { runAudioDeviceSelectSuite } from "./audio-device-select-suite";
import { runAudioHooksSuite } from "./audio-hooks-suite";
import { runAudioPlayerSuite } from "./audio-player-suite";
import { runBlocksSuite } from "./blocks-suite";
import { runParitySuite } from "./parity-suite";
import { runPlaybackSuite } from "./playback-suite";
import { runPopoverSuite } from "./popover-suite";
import { runSoundPadSuite } from "./sound-pad-suite";
import { runVisualizersSuite } from "./visualizers-suite";
import { runWaveformSuite } from "./waveform-suite";
import { runWebAudioMixerSuite } from "./web-audio-mixer-suite";

runAudioPlayerSuite("solid-1");

runBlocksSuite("solid-1");

runAudioDeviceSelectSuite("solid-1");

runSoundPadSuite("solid-1");

runWaveformSuite("solid-1");

runWebAudioMixerSuite("solid-1");

runPlaybackSuite("solid-1");

runVisualizersSuite("solid-1");

runPopoverSuite("solid-1");

runAudioHooksSuite("solid-1");

runParitySuite({
  artifactDir: "test-results/artifacts",
  runtime: "solid-1",
});
