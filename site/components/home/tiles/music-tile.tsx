import { For, createSignal } from "solid-js";

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
  AudioPlayerNext,
  AudioPlayerPlay,
  AudioPlayerPrevious,
  AudioPlayerSeek,
  AudioPlayerTime,
  AudioPlayerTitle,
} from "@/components/ui/audio-player";
import {
  TrackList,
  TrackListItem,
  TrackListItemContent,
  TrackListItemDescription,
  TrackListItemDuration,
  TrackListItemIndex,
  TrackListItemTitle,
} from "@/components/ui/track-list";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { formatTime } from "@/lib/audio/time";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const MusicTile = () => {
  const tracks = useDemoTracks();
  const [index, setIndex] = createSignal(0);
  const [picked, setPicked] = createSignal(false);
  const track = () => tracks()[index()];

  const go = (direction: number) => {
    if (!tracks().length) return;
    setIndex(
      (value) => (value + direction + tracks().length) % tracks().length
    );
    setPicked(true);
  };

  const player = useAudioPlayer(() => ({
    autoPlay: picked(),
    onEnded: () => go(1),
    src: track()?.src,
  }));

  return (
    <div class="@container w-full">
      <div class="grid gap-4 @lg:grid-cols-2">
        <AudioPlayer
          class="flex-col items-stretch gap-3"
          onNext={() => go(1)}
          onPrevious={() => go(-1)}
          player={player}
        >
          <div class="flex items-center gap-3">
            <span class="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
              <MusicNotesIcon class="size-5" />
            </span>
            <div class="flex min-w-0 flex-1 flex-col">
              <AudioPlayerTitle>
                {track()?.title ?? "Loading…"}
              </AudioPlayerTitle>
              <AudioPlayerDescription>{track()?.artist}</AudioPlayerDescription>
            </div>
          </div>
          <AudioPlayerSeek />
          <div class="flex items-center justify-between">
            <AudioPlayerTime />
            <AudioPlayerTime type="remaining" />
          </div>
          <AudioPlayerControls class="justify-center">
            <AudioPlayerPrevious>
              <SkipBackIcon />
            </AudioPlayerPrevious>
            <AudioPlayerPlay>
              {(state) =>
                state.playing ? <PauseFillIcon /> : <PlayFillIcon />
              }
            </AudioPlayerPlay>
            <AudioPlayerNext>
              <SkipForwardIcon />
            </AudioPlayerNext>
          </AudioPlayerControls>
        </AudioPlayer>
        <TrackList variant="outline">
          <For each={tracks()}>
            {(item, row) => (
              <TrackListItem
                active={row() === index()}
                playing={row() === index() && player.playing}
                onSelect={() => {
                  if (row() === index()) {
                    void player.toggle();

                    return;
                  }

                  setIndex(row());
                  setPicked(true);
                }}
              >
                <TrackListItemIndex>{row() + 1}</TrackListItemIndex>
                <TrackListItemContent>
                  <TrackListItemTitle>{item.title}</TrackListItemTitle>
                  <TrackListItemDescription>
                    {item.artist}
                  </TrackListItemDescription>
                </TrackListItemContent>
                <TrackListItemDuration>
                  {formatTime(item.duration)}
                </TrackListItemDuration>
              </TrackListItem>
            )}
          </For>
        </TrackList>
      </div>
    </div>
  );
};

export default MusicTile;
