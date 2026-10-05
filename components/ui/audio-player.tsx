import * as SliderPrimitive from "@kobalte/core/slider";
import {
  Show,
  createContext,
  createMemo,
  createSignal,
  untrack,
  useContext,
} from "solid-js";

import {
  VolumeControl,
  VolumeControlMute,
  VolumeControlSlider,
} from "@/components/ui/volume-control";
import type { VolumeControlProps } from "@/components/ui/volume-control";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import type {
  AudioPlayerController,
  UseAudioPlayerOptions,
} from "@/hooks/use-audio-player";
import { useFrameSource } from "@/hooks/use-frame-source";
import { clamp } from "@/lib/audio/decibels";
import { formatTime } from "@/lib/audio/time";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  ButtonDOMProps,
  DivDOMProps,
  ImageDOMProps,
  JSXElement,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { useKobalteSliderCompat } from "@/lib/solid/kobalte-slider";
import { forwardProps, omitProps } from "@/lib/solid/props";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

const SEEK_STEP = 5;

const SEEK_LARGE_STEP = 15;

const VOLUME_STEP = 0.05;

interface PlayerContextValue {
  readonly player: AudioPlayerController;
  readonly onPrevious?: () => void;
  readonly onNext?: () => void;
}

const PlayerContext = createContext<PlayerContextValue>();

const usePlayerPart = (part: string) => {
  const context = useContext(PlayerContext);

  if (!context) throw new Error(`${part} must be used inside AudioPlayer.`);

  return context;
};

export const useAudioPlayerContext = () =>
  usePlayerPart("useAudioPlayerContext").player;

export interface AudioPlayerProps
  extends
    Omit<
      DivDOMProps,
      | "onPlay"
      | "onPause"
      | "onEnded"
      | "onError"
      | "onTimeUpdate"
      | "onKeyDown"
    >,
    UseAudioPlayerOptions {
  className?: string;
  player?: AudioPlayerController;
  onTimeUpdate?: (time: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  shortcuts?: boolean;
  onKeyDown?: (event: KeyboardEvent) => void;
}

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

export const AudioPlayer = (props: AudioPlayerProps) => {
  return (
    <Show
      when={props.player}
      keyed
      fallback={<InternalAudioPlayer settings={props} />}
    >
      {(player) => <AudioPlayerRoot {...props} player={player} />}
    </Show>
  );
};

const InternalAudioPlayer = (props: { settings: AudioPlayerProps }) => {
  const player = useAudioPlayer(() => props.settings);

  return <AudioPlayerRoot {...props.settings} player={player} />;
};

const AudioPlayerRoot = (
  props: AudioPlayerProps & { player: AudioPlayerController }
) => {
  const player = () => props.player;

  const settings: PlayerContextValue = {
    get player() {
      return player();
    },
    get onPrevious() {
      return props.onPrevious;
    },
    get onNext() {
      return props.onNext;
    },
  };

  createCompatEffect(
    () => player().currentTime,
    (time) => props.onTimeUpdate?.(time)
  );

  const keyDown = (event: KeyboardEvent) => {
    props.onKeyDown?.(event);

    if (
      props.shortcuts === false ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isEditable(event.target)
    )
      return;
    const target = event.target;

    if (!(target instanceof HTMLElement)) return;
    const controller = player();
    const slider = target.getAttribute("role") === "slider";
    const amount = event.shiftKey ? SEEK_LARGE_STEP : SEEK_STEP;

    const actions = {
      " ": target.tagName === "BUTTON" ? null : () => void controller.toggle(),
      k: target.tagName === "BUTTON" ? null : () => void controller.toggle(),
      m: () => controller.setMuted(!controller.muted),
      ArrowDown: slider
        ? null
        : () =>
            controller.setVolume(clamp(controller.volume - VOLUME_STEP, 0, 1)),
      ArrowUp: slider
        ? null
        : () =>
            controller.setVolume(clamp(controller.volume + VOLUME_STEP, 0, 1)),
      ArrowLeft: slider
        ? null
        : () => controller.seek(controller.currentTime - amount),
      ArrowRight: slider
        ? null
        : () => controller.seek(controller.currentTime + amount),
      Home: slider ? null : () => controller.seek(0),
      End: slider ? null : () => controller.seek(controller.duration),
    };

    if (!Object.hasOwn(actions, event.key)) return;
    // SAFETY: The own-property check proves this is a player shortcut.
    const action = actions[event.key as keyof typeof actions];

    if (action) {
      event.preventDefault();
      action();
    }
  };

  const rest = omitProps(props, [
    "class",
    "className",
    "children",
    "player",
    "onPrevious",
    "onNext",
    "onTimeUpdate",
    "shortcuts",
    "onKeyDown",
    "src",
    "autoPlay",
    "loop",
    "volume",
    "muted",
    "playbackRate",
    "preload",
    "crossOrigin",
    "onPlay",
    "onPause",
    "onEnded",
    "onError",
  ]);

  return provideContext(PlayerContext, settings, () => (
    <div
      class={cn(
        "group/audio-player flex flex-wrap items-center gap-x-3 gap-y-2 outline-none",
        props.class,
        props.className
      )}
      data-slot="audio-player"
      role="group"
      data-ended={player().status === "ended" ? "" : undefined}
      data-error={player().status === "error" ? "" : undefined}
      data-loading={player().status === "loading" ? "" : undefined}
      data-muted={player().muted ? "" : undefined}
      data-paused={player().playing ? undefined : ""}
      data-playing={player().playing ? "" : undefined}
      onKeyDown={keyDown}
      {...rest}
    >
      {props.children}
    </div>
  ));
};

interface ImageProps extends ImageDOMProps {
  className?: string;
}

interface SpanProps extends SpanDOMProps {
  className?: string;
}

interface DivProps extends DivDOMProps {
  className?: string;
}

export const AudioPlayerArtwork = (props: ImageProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <img
      alt=""
      class={cn(
        "bg-muted size-12 shrink-0 rounded-lg object-cover",
        props.class,
        props.className
      )}
      data-slot="audio-player-artwork"
      {...rest}
    />
  );
};

export const AudioPlayerTitle = (props: SpanProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <span
      class={cn("truncate text-sm font-medium", props.class, props.className)}
      data-slot="audio-player-title"
      {...rest}
    />
  );
};

export const AudioPlayerDescription = (props: SpanProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <span
      class={cn(
        "text-muted-foreground truncate text-xs",
        props.class,
        props.className
      )}
      data-slot="audio-player-description"
      {...rest}
    />
  );
};

export const AudioPlayerControls = (props: DivProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <div
      class={cn("flex items-center gap-1", props.class, props.className)}
      data-slot="audio-player-controls"
      {...rest}
    />
  );
};

const BUTTON_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40 [&_svg:not([class*='size-'])]:size-4";

export interface PlayerButtonState {
  readonly slot: string;
  readonly playing?: boolean;
  readonly loading?: boolean;
  readonly looping?: boolean;
}

export interface PlayerButtonRenderProps extends ButtonDOMProps {
  "data-slot": string;
  "data-playing"?: string;
  "data-loading"?: string;
  "data-looping"?: string;
  onClick: (event: MouseEvent) => void;
}

export interface PlayerButtonProps extends Omit<ButtonDOMProps, "onClick"> {
  className?: string;
  onClick?: (event: MouseEvent) => void;
  render?: (
    props: PlayerButtonRenderProps,
    state: PlayerButtonState
  ) => JSXElement;
}

interface ButtonProps extends PlayerButtonProps {
  slotName: string;
  label: string;
  action: () => void;
  playing?: boolean;
  loading?: boolean;
  looping?: boolean;
}

const PlayerButton = (props: ButtonProps) => {
  const rest = omitProps(props, [
    "class",
    "className",
    "slotName",
    "label",
    "action",
    "onClick",
    "children",
    "render",
    "playing",
    "loading",
    "looping",
  ]);

  const state: PlayerButtonState = {
    get slot() {
      return props.slotName;
    },
    get playing() {
      return props.playing;
    },
    get loading() {
      return props.loading;
    },
    get looping() {
      return props.looping;
    },
  };

  const renderProps: PlayerButtonRenderProps = {
    get "aria-label"() {
      return props.label;
    },
    get class() {
      return cn(
        BUTTON_CLASS,
        !props.children && "w-auto px-2.5",
        props.class,
        props.className
      );
    },
    type: "button",
    get "data-slot"() {
      return props.slotName;
    },
    get "data-playing"() {
      return props.playing ? "" : undefined;
    },
    get "data-loading"() {
      return props.loading ? "" : undefined;
    },
    get "data-looping"() {
      return props.looping ? "" : undefined;
    },
    onClick: (event: MouseEvent) => {
      props.onClick?.(event);

      if (!event.defaultPrevented) props.action();
    },
    get children() {
      return props.children ?? <span class="text-xs">{props.label}</span>;
    },
  };

  forwardProps(renderProps, rest);
  const render = untrack(() => props.render);

  if (render) {
    const rendered = createMemo(() => render(renderProps, state));

    return <>{rendered()}</>;
  }

  return <button {...renderProps} />;
};

interface PlayState {
  playing: boolean;
  loading: boolean;
}

export interface AudioPlayerPlayProps extends Omit<
  PlayerButtonProps,
  "children"
> {
  children?: JSXElement | ((state: PlayState) => JSXElement);
}

const isPlayRenderer = (
  children: AudioPlayerPlayProps["children"]
): children is (state: PlayState) => JSXElement =>
  typeof children === "function";

export const AudioPlayerPlay = (props: AudioPlayerPlayProps) => {
  const settings = usePlayerPart("AudioPlayerPlay");
  const rest = omitProps(props, ["children", "class", "className"]);

  return (
    <PlayerButton
      slotName="audio-player-play"
      label={settings.player.playing ? "Pause" : "Play"}
      action={() => void settings.player.toggle()}
      class={cn(
        "bg-primary text-primary-foreground hover:bg-primary/85 size-10",
        props.class,
        props.className
      )}
      disabled={
        settings.player.status === "idle" || settings.player.status === "error"
      }
      data-loading={settings.player.status === "loading" ? "" : undefined}
      data-playing={settings.player.playing ? "" : undefined}
      loading={settings.player.status === "loading"}
      playing={settings.player.playing}
      {...rest}
    >
      {isPlayRenderer(props.children)
        ? props.children({
            get playing() {
              return settings.player.playing;
            },
            get loading() {
              return settings.player.status === "loading";
            },
          })
        : props.children}
    </PlayerButton>
  );
};

export const AudioPlayerPrevious = (props: PlayerButtonProps) => {
  const settings = usePlayerPart("AudioPlayerPrevious");

  return (
    <PlayerButton
      slotName="audio-player-previous"
      label="Previous"
      action={() => settings.onPrevious?.()}
      disabled={!settings.onPrevious}
      {...props}
    />
  );
};

export const AudioPlayerNext = (props: PlayerButtonProps) => {
  const settings = usePlayerPart("AudioPlayerNext");

  return (
    <PlayerButton
      slotName="audio-player-next"
      label="Next"
      action={() => settings.onNext?.()}
      disabled={!settings.onNext}
      {...props}
    />
  );
};

export interface AudioPlayerSkipProps extends PlayerButtonProps {
  seconds?: number;
}

export const AudioPlayerSkipBack = (props: AudioPlayerSkipProps) => {
  const settings = usePlayerPart("AudioPlayerSkipBack");
  const rest = omitProps(props, ["seconds"]);

  return (
    <PlayerButton
      slotName="audio-player-skip-back"
      label={`Back ${props.seconds ?? 10} seconds`}
      action={() =>
        settings.player.seek(
          settings.player.currentTime - (props.seconds ?? 10)
        )
      }
      {...rest}
    />
  );
};

export const AudioPlayerSkipForward = (props: AudioPlayerSkipProps) => {
  const settings = usePlayerPart("AudioPlayerSkipForward");
  const rest = omitProps(props, ["seconds"]);

  return (
    <PlayerButton
      slotName="audio-player-skip-forward"
      label={`Forward ${props.seconds ?? 10} seconds`}
      action={() =>
        settings.player.seek(
          settings.player.currentTime + (props.seconds ?? 10)
        )
      }
      {...rest}
    />
  );
};

const SeekCompat = () => {
  useKobalteSliderCompat(SliderPrimitive.useSliderContext(), {
    suppressStep: true,
  });

  return null;
};

type SliderProps = Parameters<typeof SliderPrimitive.Root>[0];

export interface AudioPlayerSeekProps extends Omit<
  SliderProps,
  | "value"
  | "defaultValue"
  | "onChange"
  | "onChangeEnd"
  | "minValue"
  | "maxValue"
  | "step"
  | "children"
> {
  className?: string;
  step?: number;
  largeStep?: number;
}

export const AudioPlayerSeek = (props: AudioPlayerSeekProps) => {
  const settings = usePlayerPart("AudioPlayerSeek");
  const [time, setTime] = createSignal(settings.player.currentTime);
  const [drag, setDrag] = createSignal<number | null>(null);
  useFrameSource(
    () => settings.player.time,
    (next) => {
      if (drag() === null) setTime(next);
    }
  );
  createCompatEffect(
    () => settings.player.currentTime,
    (next) => {
      if (drag() === null) setTime(next);
    }
  );
  const duration = () => settings.player.duration || 0;
  const value = () => drag() ?? time();

  const sliderValue = createMemo(() => [
    clamp(value(), 0, Math.max(duration(), 0.001)),
  ]);

  const seek = (next: number) => {
    settings.player.seek(next);
    setTime(next);
    setDrag(null);
  };

  const keyDown = (event: KeyboardEvent) => {
    const amount = event.shiftKey
      ? (props.largeStep ?? SEEK_LARGE_STEP)
      : (props.step ?? SEEK_STEP);

    const targets = {
      ArrowRight: value() + amount,
      ArrowUp: value() + amount,
      ArrowLeft: value() - amount,
      ArrowDown: value() - amount,
      Home: 0,
      End: duration(),
    };

    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    // SAFETY: The own-property check proves this is a seek navigation key.
    seek(targets[event.key as keyof typeof targets]);
  };

  const rest = omitProps(props, ["class", "className", "step", "largeStep"]);

  return (
    <SliderPrimitive.Root
      class={cn(
        "relative flex min-w-24 flex-1 touch-none items-center select-none",
        props.class,
        props.className
      )}
      data-slot="audio-player-seek"
      disabled={duration() === 0}
      minValue={0}
      maxValue={Math.max(duration(), 0.001)}
      step={0.01}
      value={sliderValue()}
      onChange={(values) => setDrag(values[0] ?? 0)}
      onChangeEnd={(values) => seek(values[0] ?? 0)}
      getValueLabel={() =>
        `${formatTime(value())} of ${formatTime(duration())}`
      }
      {...rest}
    >
      <SeekCompat />
      <SliderPrimitive.Track class="relative flex h-4 w-full items-center px-1.5 before:absolute before:inset-x-0 before:-inset-y-1.5 pointer-coarse:before:-inset-y-3">
        <div
          class="bg-input/90 relative h-1 w-full grow rounded-full"
          data-slot="audio-player-seek-track"
        >
          <div
            class="bg-muted-foreground/25 absolute inset-y-0 left-0 w-(--buffered) rounded-full"
            data-slot="audio-player-seek-buffered"
            style={{
              "--buffered": `${duration() > 0 ? clamp(settings.player.buffered / duration(), 0, 1) * 100 : 0}%`,
            }}
          />
          <div
            class="bg-primary absolute inset-y-0 left-0 rounded-full"
            data-slot="audio-player-seek-range"
            style={{
              width: `${duration() > 0 ? (value() / duration()) * 100 : 0}%`,
            }}
          />
        </div>
        <SliderPrimitive.Thumb
          aria-label="Seek"
          aria-valuetext={`${formatTime(value())} of ${formatTime(duration())}`}
          class="bg-background ring-foreground/15 hover:ring-ring/30 focus-visible:ring-ring/40 block size-3 shrink-0 rounded-full shadow-sm ring-1 outline-hidden transition-[box-shadow] hover:ring-4 focus-visible:ring-4"
          data-slot="audio-player-seek-thumb"
          onKeyDown={keyDown}
        >
          <SliderPrimitive.Input />
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Track>
    </SliderPrimitive.Root>
  );
};

export interface AudioPlayerTimeProps extends Omit<SpanProps, "style"> {
  style?: StyleValue;
  type?: "current" | "remaining" | "duration";
  format?: (
    seconds: number,
    type: "current" | "remaining" | "duration"
  ) => string;
}

const defaultTimeFormat = (
  seconds: number,
  type: "current" | "remaining" | "duration"
) => formatTime(seconds, { remaining: type === "remaining" });

export const AudioPlayerTime = (props: AudioPlayerTimeProps) => {
  const settings = usePlayerPart("AudioPlayerTime");
  const type = () => props.type ?? "current";

  const format = (seconds: number) =>
    (props.format ?? defaultTimeFormat)(seconds, type());

  const seconds = () =>
    type() === "duration"
      ? settings.player.duration
      : type() === "remaining"
        ? Math.max(0, settings.player.duration - settings.player.currentTime)
        : settings.player.currentTime;

  const rest = omitProps(props, [
    "class",
    "className",
    "style",
    "type",
    "format",
  ]);

  return (
    <span
      class={cn(
        "text-muted-foreground inline-block min-w-(--audio-player-time-width) text-end font-mono text-xs whitespace-nowrap tabular-nums",
        props.class,
        props.className
      )}
      data-slot="audio-player-time"
      data-type={type()}
      style={mergeStyleVars(props.style, {
        "--audio-player-time-width": `${Math.max(format(0).length, format(settings.player.duration).length)}ch`,
      })}
      {...rest}
    >
      {format(seconds())}
    </span>
  );
};

export type AudioPlayerVolumeProps = Omit<
  VolumeControlProps,
  | "value"
  | "defaultValue"
  | "onValueChange"
  | "muted"
  | "defaultMuted"
  | "onMutedChange"
>;

export const AudioPlayerVolume = (props: AudioPlayerVolumeProps) => {
  const settings = usePlayerPart("AudioPlayerVolume");
  const rest = omitProps(props, ["class", "className", "children"]);

  return (
    <VolumeControl
      class={cn("w-32", props.class, props.className)}
      data-slot="audio-player-volume"
      value={settings.player.volume}
      muted={settings.player.muted}
      onValueChange={(next) => settings.player.setVolume(next)}
      onMutedChange={(next) => settings.player.setMuted(next)}
      {...rest}
    >
      {props.children ?? (
        <>
          <VolumeControlMute />
          <VolumeControlSlider />
        </>
      )}
    </VolumeControl>
  );
};

export interface AudioPlayerRateProps extends PlayerButtonProps {
  rates?: number[];
}

export const AudioPlayerRate = (props: AudioPlayerRateProps) => {
  const settings = usePlayerPart("AudioPlayerRate");
  const rates = () => props.rates ?? DEFAULT_RATES;
  const rest = omitProps(props, ["class", "className", "rates", "children"]);

  return (
    <PlayerButton
      slotName="audio-player-rate"
      label={`Playback speed ${settings.player.playbackRate}×`}
      class={cn("w-auto px-2", props.class, props.className)}
      action={() =>
        settings.player.setPlaybackRate(
          rates()[
            (rates().indexOf(settings.player.playbackRate) + 1) % rates().length
          ] ?? 1
        )
      }
      {...rest}
    >
      {props.children ?? (
        <span
          class="inline-block min-w-(--rate-width) text-center font-mono text-xs tabular-nums"
          style={{
            "--rate-width": `${Math.max(...rates().map((rate) => `${rate}×`.length))}ch`,
          }}
        >
          {settings.player.playbackRate}×
        </span>
      )}
    </PlayerButton>
  );
};

export const AudioPlayerLoop = (props: PlayerButtonProps) => {
  const settings = usePlayerPart("AudioPlayerLoop");
  const rest = omitProps(props, ["class", "className"]);

  return (
    <PlayerButton
      slotName="audio-player-loop"
      label={settings.player.loop ? "Loop on" : "Loop off"}
      action={() => settings.player.setLoop(!settings.player.loop)}
      aria-pressed={settings.player.loop ? "true" : "false"}
      data-looping={settings.player.loop ? "" : undefined}
      looping={settings.player.loop}
      class={cn(
        "aria-pressed:bg-muted aria-pressed:text-primary",
        props.class,
        props.className
      )}
      {...rest}
    />
  );
};
