import { For, Show } from "solid-js";

import {
  SoundPad,
  SoundPadGrid,
  SoundPadLabel,
  SoundPadProgress,
} from "@/components/ui/sound-pad";
import type { SoundPadMode } from "@/components/ui/sound-pad";
import { useSound } from "@/hooks/use-sound";
import { useDemoSounds } from "@/lib/docs/use-demo-audio";
import type { DemoSoundSource } from "@/lib/docs/use-demo-audio";

type HomeSound = Omit<DemoSoundSource, "src"> & { src: string | AudioBuffer };

// Site-only Blizzard recording. It is excluded from the registry, see license.md.
const WORK_WORK: HomeSound = {
  accent: "oklch(0.7 0.2 30)",
  hotkey: "1",
  id: "work-work",
  label: "Work, work",
  src: "/sounds/peon-work-work.wav",
};

const Pad = (props: { sound: HomeSound }) => {
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
      loading={!player.isLoaded}
      mode={mode()}
      onStop={player.stop}
      onTrigger={player.play}
      playing={player.isPlaying}
    >
      <SoundPadLabel>{props.sound.label}</SoundPadLabel>
      <SoundPadProgress
        source={player.progress}
        variant={mode() === "one-shot" ? "bar" : "ring"}
      />
    </SoundPad>
  );
};

const SoundPadsTile = () => {
  const sounds = useDemoSounds();

  return (
    <Show
      when={sounds().length}
      fallback={
        <div class="bg-muted h-76 w-full animate-pulse rounded-lg motion-reduce:animate-none @sm:h-50" />
      }
    >
      <SoundPadGrid class="w-full" columns={4}>
        <For each={sounds()}>
          {(sound) => (
            <Pad sound={sound.id === "airhorn" ? WORK_WORK : sound} />
          )}
        </For>
      </SoundPadGrid>
    </Show>
  );
};

export default SoundPadsTile;
