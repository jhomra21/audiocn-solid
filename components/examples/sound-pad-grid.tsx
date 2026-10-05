import { For } from "solid-js";

import {
  SoundPad,
  SoundPadGrid,
  SoundPadLabel,
  SoundPadProgress,
  SoundPadShortcut,
} from "@/components/ui/sound-pad";
import type { SoundPadMode } from "@/components/ui/sound-pad";
import { useSound } from "@/hooks/use-sound";
import { useDemoSounds } from "@/lib/docs/use-demo-audio";
import type { DemoSoundSource } from "@/lib/docs/use-demo-audio";

const Pad = (props: { sound: DemoSoundSource }) => {
  const mode = (): SoundPadMode =>
    props.sound.id === "drumroll"
      ? "hold"
      : props.sound.id === "whoosh"
        ? "toggle"
        : "one-shot";

  const player = useSound(
    () => props.sound.src,
    () => ({ loop: mode() !== "one-shot" })
  );

  return (
    <SoundPad
      accent={props.sound.accent}
      hotkey={props.sound.hotkey}
      loading={!player.isLoaded}
      mode={mode()}
      onStop={player.stop}
      onTrigger={player.play}
      playing={player.isPlaying}
    >
      <SoundPadLabel>{props.sound.label}</SoundPadLabel>
      <SoundPadShortcut />
      <SoundPadProgress
        source={player.progress}
        variant={mode() === "one-shot" ? "bar" : "ring"}
      />
    </SoundPad>
  );
};

const SoundPadGridDemo = () => {
  const sounds = useDemoSounds();

  return (
    <SoundPadGrid class="w-full max-w-lg" columns={4} hotkeys>
      <For each={sounds()}>{(sound) => <Pad sound={sound} />}</For>
    </SoundPadGrid>
  );
};

export default SoundPadGridDemo;
