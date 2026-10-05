import { Show } from "solid-js";

import { MusicPlayer } from "@/components/blocks/music-player/music-player";
import { Button } from "@/components/ui/button";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const MusicPlayerDucking = () => {
  const tracks = useDemoTracks();
  const microphone = useMicrophone();
  const analyser = useAudioAnalyser(() => microphone.stream);
  const listening = () => microphone.status === "active";

  return (
    <div class="flex w-full max-w-md flex-col gap-3">
      <Button
        class="self-start"
        onClick={() =>
          listening() ? microphone.stop() : void microphone.start()
        }
        size="sm"
        variant="outline"
      >
        {listening() ? "Stop microphone" : "Use my microphone to duck"}
      </Button>
      <Show when={tracks().length}>
        <MusicPlayer duckingSource={analyser.meter} tracks={tracks()} />
      </Show>
    </div>
  );
};

export default MusicPlayerDucking;
