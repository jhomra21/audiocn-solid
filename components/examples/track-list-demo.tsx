import { For, createSignal } from "solid-js";

import { DotsThreeIcon } from "@/components/icons/phosphor";
import { Button } from "@/components/ui/button";
import {
  TrackList,
  TrackListItem,
  TrackListItemActions,
  TrackListItemContent,
  TrackListItemDescription,
  TrackListItemDuration,
  TrackListItemIndex,
  TrackListItemTitle,
} from "@/components/ui/track-list";
import { formatTime } from "@/lib/audio/time";

const tracks = [
  {
    artist: "audiocn",
    duration: 19.2,
    id: "night-drive",
    title: "Night Drive",
  },
  { artist: "audiocn", duration: 24, id: "low-tide", title: "Low Tide" },
  { artist: "audiocn", duration: 13.7, id: "arcade", title: "Arcade" },
  { artist: "Not available", duration: 201, id: "locked", title: "Unreleased" },
];

const TrackListDemo = () => {
  const [current, setCurrent] = createSignal("low-tide");
  const [playing, setPlaying] = createSignal(true);

  return (
    <TrackList class="max-w-md" variant="outline">
      <For each={tracks}>
        {(track, index) => (
          <TrackListItem
            active={track.id === current()}
            disabled={track.id === "locked"}
            onSelect={() => {
              setPlaying(track.id === current() ? !playing() : true);
              setCurrent(track.id);
            }}
            playing={track.id === current() && playing()}
          >
            <TrackListItemIndex>{index() + 1}</TrackListItemIndex>
            <TrackListItemContent>
              <TrackListItemTitle>{track.title}</TrackListItemTitle>
              <TrackListItemDescription>
                {track.artist}
              </TrackListItemDescription>
            </TrackListItemContent>
            <TrackListItemDuration>
              {formatTime(track.duration)}
            </TrackListItemDuration>
            <TrackListItemActions>
              <Button
                aria-label={`More options for ${track.title}`}
                size="icon-xs"
                variant="ghost"
              >
                <DotsThreeIcon />
              </Button>
            </TrackListItemActions>
          </TrackListItem>
        )}
      </For>
    </TrackList>
  );
};

export default TrackListDemo;
