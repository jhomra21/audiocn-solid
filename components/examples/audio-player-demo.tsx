import {
  MusicNotesIcon,
  PauseFillIcon,
  PlayFillIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "@/components/icons/phosphor";
import {
  AudioPlayer,
  AudioPlayerControls,
  AudioPlayerDescription,
  AudioPlayerPlay,
  AudioPlayerSeek,
  AudioPlayerSkipBack,
  AudioPlayerSkipForward,
  AudioPlayerTime,
  AudioPlayerTitle,
  AudioPlayerVolume,
} from "@/components/ui/audio-player";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const AudioPlayerDemo = () => {
  const tracks = useDemoTracks();
  const track = () => tracks()[0];

  return (
    <AudioPlayer
      class="w-full max-w-md flex-col items-stretch rounded-xl border p-4"
      src={track()?.src}
    >
      <div class="flex items-center gap-3">
        <span class="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-lg">
          <MusicNotesIcon class="size-5" />
        </span>
        <div class="flex min-w-0 flex-col">
          <AudioPlayerTitle>{track()?.title ?? "Loading…"}</AudioPlayerTitle>
          <AudioPlayerDescription>{track()?.artist}</AudioPlayerDescription>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <AudioPlayerTime />
        <AudioPlayerSeek />
        <AudioPlayerTime type="remaining" />
      </div>
      <div class="flex items-center justify-between">
        <AudioPlayerControls>
          <AudioPlayerSkipBack>
            <SkipBackIcon />
          </AudioPlayerSkipBack>
          <AudioPlayerPlay>
            {(state) => (state.playing ? <PauseFillIcon /> : <PlayFillIcon />)}
          </AudioPlayerPlay>
          <AudioPlayerSkipForward>
            <SkipForwardIcon />
          </AudioPlayerSkipForward>
        </AudioPlayerControls>
        <AudioPlayerVolume />
      </div>
    </AudioPlayer>
  );
};

export default AudioPlayerDemo;
