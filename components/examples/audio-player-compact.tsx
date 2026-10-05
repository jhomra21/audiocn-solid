import { PauseFillIcon, PlayFillIcon } from "@/components/icons/phosphor";
import {
  AudioPlayer,
  AudioPlayerPlay,
  AudioPlayerRate,
  AudioPlayerSeek,
  AudioPlayerTime,
} from "@/components/ui/audio-player";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const AudioPlayerCompact = () => {
  const tracks = useDemoTracks();

  return (
    <AudioPlayer
      class="w-full max-w-md rounded-full border py-1 pr-3 pl-1"
      src={tracks()[1]?.src}
    >
      <AudioPlayerPlay class="size-8">
        {(state) => (state.playing ? <PauseFillIcon /> : <PlayFillIcon />)}
      </AudioPlayerPlay>
      <AudioPlayerSeek />
      <AudioPlayerTime type="remaining" />
      <AudioPlayerRate />
    </AudioPlayer>
  );
};

export default AudioPlayerCompact;
