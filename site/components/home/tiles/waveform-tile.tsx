import { Show, createSignal } from "solid-js";

import { PauseFillIcon, PlayFillIcon } from "@/components/icons/phosphor";
import { Button } from "@/components/ui/button";
import {
  Waveform,
  WaveformCanvas,
  WaveformCursor,
  WaveformHover,
  WaveformMarker,
  WaveformRegion,
} from "@/components/ui/waveform";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useWaveformData } from "@/hooks/use-waveform-data";
import { formatTime } from "@/lib/audio/time";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const WaveformTile = () => {
  const tracks = useDemoTracks();
  const track = () => tracks()[1];
  const player = useAudioPlayer(() => ({ src: track()?.src }));

  const waveform = useWaveformData(() => track()?.src ?? null, {
    samples: 400,
  });

  const [clip, setClip] = createSignal({ end: 13, start: 5 });

  return (
    <div class="flex w-full flex-col gap-3">
      <div class="flex items-center gap-3">
        <Button
          aria-label={player.playing ? "Pause" : "Play"}
          disabled={!track()}
          onClick={() => void player.toggle()}
          size="icon"
          variant="outline"
        >
          <Show when={player.playing} fallback={<PlayFillIcon />}>
            <PauseFillIcon />
          </Show>
        </Button>
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-medium">
            {track()?.title ?? "Loading…"}
          </span>
          <span class="text-muted-foreground font-mono text-xs">
            Clip {formatTime(clip().start)} – {formatTime(clip().end)}
          </span>
        </div>
      </div>
      <Waveform
        aria-label={track()?.title ?? "Track"}
        class="h-24"
        duration={waveform.duration}
        loading={waveform.status !== "ready"}
        onSeekCommitted={player.seek}
        peaks={waveform.peaks}
        time={player.time}
        variant="mirror"
      >
        <WaveformCanvas />
        <WaveformRegion
          end={clip().end}
          onValueChange={setClip}
          start={clip().start}
        />
        <WaveformMarker time={17}>Outro</WaveformMarker>
        <WaveformCursor />
        <WaveformHover />
      </Waveform>
    </div>
  );
};

export default WaveformTile;
