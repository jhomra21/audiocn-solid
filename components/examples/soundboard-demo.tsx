import { Show } from "solid-js";

import { Soundboard } from "@/components/blocks/soundboard/soundboard";
import { useDemoSounds } from "@/lib/docs/use-demo-audio";

const SoundboardDemo = () => {
  const sounds = useDemoSounds();

  return (
    <Show
      when={sounds().length}
      fallback={<p class="text-muted-foreground text-sm">Preparing sounds…</p>}
    >
      <Soundboard class="w-full max-w-2xl" defaultSounds={sounds()} />
    </Show>
  );
};

export default SoundboardDemo;
