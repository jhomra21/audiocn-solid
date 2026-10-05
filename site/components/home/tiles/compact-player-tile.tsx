import { PauseFillIcon, PlayFillIcon } from "@/components/icons/phosphor";
import {
  AudioPlayer,
  AudioPlayerPlay,
  AudioPlayerRate,
  AudioPlayerSeek,
  AudioPlayerTime,
} from "@/components/ui/audio-player";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const CompactPlayerTile = () => {
  const tracks = useDemoTracks();

  return (
    <AudioPlayer
      class="w-full rounded-full border py-1 pr-3 pl-1"
      src={tracks()[2]?.src}
    >
      <AudioPlayerPlay class="size-8">
        {(state) => (state.playing ? <PauseFillIcon /> : <PlayFillIcon />)}
      </AudioPlayerPlay>
      <AudioPlayerSeek />
      <AudioPlayerTime type="remaining" />
      <AudioPlayerRate class="@max-2xs:hidden" />
    </AudioPlayer>
  );
};

export default CompactPlayerTile;
