import { Show } from "solid-js";

import { MusicPlayer } from "@/components/blocks/music-player/music-player";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const MusicPlayerDemo = () => {
  const tracks = useDemoTracks();

  return (
    <Show
      when={tracks().length}
      fallback={<p class="text-muted-foreground text-sm">Preparing tracks…</p>}
    >
      <MusicPlayer class="w-full max-w-md" tracks={tracks()} />
    </Show>
  );
};

export default MusicPlayerDemo;
