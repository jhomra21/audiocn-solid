import {
  For,
  Show,
  createSignal,
  createMemo,
  createUniqueId,
  onCleanup,
} from "solid-js";

import {
  PlusIcon,
  SpeakerHighIcon,
  StopIcon,
  WaveformIcon,
} from "@/components/icons/phosphor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  SoundPad,
  SoundPadGrid,
  SoundPadLabel,
  SoundPadProgress,
  SoundPadShortcut,
} from "@/components/ui/sound-pad";
import type { SoundPadMode } from "@/components/ui/sound-pad";
import { Switch } from "@/components/ui/switch";
import {
  VolumeControl,
  VolumeControlMute,
  VolumeControlSlider,
} from "@/components/ui/volume-control";
import { useGainNode } from "@/hooks/use-gain-node";
import { useSound } from "@/hooks/use-sound";
import { createCompatEffect } from "@/lib/solid/effect";
import { cn } from "@/lib/utils";

export interface SoundboardSound {
  id: string;
  label: string;
  src: string | AudioBuffer;
  hotkey?: string;
  mode?: SoundPadMode;
  volume?: number;
  accent?: string;
}

export interface SoundboardProps {
  sounds?: SoundboardSound[];
  defaultSounds?: SoundboardSound[];
  onSoundsChange?: (sounds: SoundboardSound[]) => void;
  output?: AudioNode | null;
  columns?: number;
  class?: string;
  className?: string;
}

const MODES: { value: SoundPadMode; label: string }[] = [
  { label: "One shot", value: "one-shot" },
  { label: "Toggle", value: "toggle" },
  { label: "Hold", value: "hold" },
  { label: "Loop", value: "loop" },
];

const VOLUMES = [1, 0.75, 0.5, 0.25];

const AUDIO_FILE = /^audio\//u;

const FILE_EXTENSION = /\.[^.]+$/u;

const NO_SOUNDS: SoundboardSound[] = [];

interface PadProps {
  sound: SoundboardSound;
  bus: AudioNode | null;
  onChange: (sound: SoundboardSound) => void;
  onRemove: () => void;
  register: (id: string, stop: () => void) => () => void;
}

const Pad = (props: PadProps) => {
  const mode = () => props.sound.mode ?? "one-shot";

  const player = useSound(
    () => props.sound.src,
    () => ({
      destination: props.bus,
      interrupt: mode() !== "one-shot",
      loop: mode() === "loop",
      volume: props.sound.volume ?? 1,
    })
  );

  createCompatEffect(
    () => props.sound.id,
    (id) => props.register(id, player.stop)
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger
        data-slot="context-menu-trigger"
        as={SoundPad}
        accent={props.sound.accent}
        hotkey={props.sound.hotkey}
        loading={!player.isLoaded && !player.error}
        disabled={Boolean(player.error)}
        data-error={player.error ? "" : undefined}
        mode={mode()}
        onStop={() => player.stop()}
        onTrigger={() => player.play()}
        playing={player.isPlaying}
      >
        <SoundPadLabel>{props.sound.label}</SoundPadLabel>
        <SoundPadShortcut />
        <SoundPadProgress source={player.progress} />
      </ContextMenuTrigger>
      <ContextMenuContent class="w-48">
        <ContextMenuGroup>
          <ContextMenuLabel>Mode</ContextMenuLabel>
          <ContextMenuRadioGroup
            value={mode()}
            onValueChange={(value) => {
              const selected = MODES.find((option) => option.value === value);

              if (selected)
                props.onChange({ ...props.sound, mode: selected.value });
            }}
          >
            <For each={MODES}>
              {(option) => (
                <ContextMenuRadioItem value={option.value}>
                  {option.label}
                </ContextMenuRadioItem>
              )}
            </For>
          </ContextMenuRadioGroup>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Volume</ContextMenuLabel>
          <ContextMenuRadioGroup
            value={String(props.sound.volume ?? 1)}
            onValueChange={(value) =>
              props.onChange({ ...props.sound, volume: Number(value) })
            }
          >
            <For each={VOLUMES}>
              {(volume) => (
                <ContextMenuRadioItem value={String(volume)}>
                  {Math.round(volume * 100)}%
                </ContextMenuRadioItem>
              )}
            </For>
          </ContextMenuRadioGroup>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            onSelect={() => props.onRemove()}
            variant="destructive"
          >
            Remove
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const Soundboard = (props: SoundboardProps) => {
  const [soundsState, setSoundsState] = createSignal(
    props.defaultSounds ?? NO_SOUNDS
  );

  const sounds = () => props.sounds ?? soundsState();

  const soundMap = createMemo(
    () => new Map(sounds().map((sound) => [sound.id, sound]))
  );

  const soundIds = createMemo(() => Array.from(soundMap().keys()));
  const [volume, setVolume] = createSignal(1);
  const [muted, setMuted] = createSignal(false);

  const bus = useGainNode(() => ({
    destination: props.output,
    gain: muted() ? 0 : volume() ** 2,
  }));

  const [hotkeys, setHotkeys] = createSignal(true);
  const [dragging, setDragging] = createSignal(false);
  const [feedback, setFeedback] = createSignal("");

  const [removedSound, setRemovedSound] = createSignal<{
    sound: SoundboardSound;
    index: number;
  } | null>(null);

  const hotkeysId = createUniqueId();
  let fileInput: HTMLInputElement | undefined;
  const pads = new Map<string, () => void>();
  const objectUrls = new Set<string>();
  onCleanup(() => {
    // A controlling parent may still hold these URLs after this board unmounts.
    if (props.sounds !== undefined) return;

    for (const url of objectUrls) URL.revokeObjectURL(url);
  });

  const register = (id: string, stop: () => void) => {
    pads.set(id, stop);

    return () => {
      if (pads.get(id) === stop) pads.delete(id);
    };
  };

  const update = (next: SoundboardSound[]) => {
    if (props.sounds === undefined) setSoundsState(next);
    props.onSoundsChange?.(next);
  };

  // Frees a dropped file once no pad uses it and its removal can't be undone.
  const releaseObjectUrl = ({ src }: SoundboardSound) => {
    const url = [...objectUrls].find((owned) => owned === src);

    if (url && !sounds().some((item) => item.src === url)) {
      objectUrls.delete(url);
      URL.revokeObjectURL(url);
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const existingIds = new Set(sounds().map((sound) => sound.id));
    const added: SoundboardSound[] = [];

    for (const file of files) {
      const id = `${file.name}-${file.lastModified}`;

      if (!AUDIO_FILE.test(file.type) || existingIds.has(id)) continue;
      existingIds.add(id);
      const src = URL.createObjectURL(file);
      objectUrls.add(src);
      const index = sounds().length + added.length;
      added.push({
        id,
        label: file.name.replace(FILE_EXTENSION, ""),
        src,
        hotkey: index < 9 ? String(index + 1) : undefined,
      });
    }

    if (!added.length) {
      setFeedback(
        "No new sounds added. Choose audio files that aren't already on the board."
      );

      return;
    }

    update([...sounds(), ...added]);
    setFeedback(
      `Added ${added.length} ${added.length === 1 ? "sound" : "sounds"}.`
    );
  };

  const removeSound = (sound: SoundboardSound) => {
    const previous = removedSound();

    if (previous) releaseObjectUrl(previous.sound);
    setRemovedSound({
      index: sounds().findIndex((item) => item.id === sound.id),
      sound,
    });
    update(sounds().filter((item) => item.id !== sound.id));
    setFeedback(`Removed ${sound.label}. You can undo this removal.`);
  };

  const undoRemoval = () => {
    const removed = removedSound();

    if (!removed) return;

    if (!sounds().some((item) => item.id === removed.sound.id))
      update([
        ...sounds().slice(0, removed.index),
        removed.sound,
        ...sounds().slice(removed.index),
      ]);
    setRemovedSound(null);
    setFeedback(`Restored ${removed.sound.label}.`);
  };

  return (
    <div
      class={cn(props.class, props.className)}
      data-dragging={dragging() ? "" : undefined}
      data-slot="soundboard"
      onDragLeave={() => setDragging(false)}
      onDragOver={(event: DragEvent) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer?.files ?? null);
      }}
    >
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <h3 class="font-heading mr-auto font-medium">Soundboard</h3>
        <div class="flex items-center gap-2">
          <Switch
            checked={hotkeys()}
            id={hotkeysId}
            onCheckedChange={setHotkeys}
            size="sm"
          />
          <Label for={hotkeysId}>Hotkeys</Label>
        </div>
        <VolumeControl
          class="w-36"
          muted={muted()}
          onMutedChange={setMuted}
          onValueChange={setVolume}
          value={volume()}
        >
          <VolumeControlMute>
            <SpeakerHighIcon />
          </VolumeControlMute>
          <VolumeControlSlider />
        </VolumeControl>
        <Button
          onClick={() => {
            for (const stop of pads.values()) stop();
            setFeedback("Stopped all sounds.");
          }}
          size="sm"
          variant="outline"
        >
          <StopIcon data-icon="inline-start" />
          Stop all
        </Button>
      </div>
      <Show when={feedback()}>
        <output aria-live="polite" class="mb-3 block">
          <Alert role="none">
            <AlertDescription>{feedback()}</AlertDescription>
            <Show when={removedSound()}>
              <div class="mt-2">
                <Button onClick={undoRemoval} size="sm" variant="outline">
                  Undo removal
                </Button>
              </div>
            </Show>
          </Alert>
        </output>
      </Show>
      <Show
        when={sounds().length}
        fallback={
          <div class="rounded-xl border border-dashed">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <WaveformIcon />
                </EmptyMedia>
                <EmptyTitle>No sounds yet</EmptyTitle>
                <EmptyDescription>
                  Drop audio files here, or add them from your computer.
                </EmptyDescription>
              </EmptyHeader>
              <Button
                onClick={() => fileInput?.click()}
                size="sm"
                variant="outline"
              >
                <PlusIcon data-icon="inline-start" />
                Add sounds
              </Button>
            </Empty>
          </div>
        }
      >
        <SoundPadGrid
          class="data-dragging:ring-2"
          columns={props.columns ?? 4}
          hotkeyScope="global"
          hotkeys={hotkeys()}
        >
          <For each={soundIds()}>
            {(id) => (
              <Show when={soundMap().get(id)}>
                {(sound) => (
                  <Pad
                    sound={sound()}
                    bus={bus}
                    register={register}
                    onChange={(next) =>
                      update(
                        sounds().map((item) => (item.id === id ? next : item))
                      )
                    }
                    onRemove={() => removeSound(sound())}
                  />
                )}
              </Show>
            )}
          </For>
          <SoundPad
            aria-label="Add sounds"
            class="text-muted-foreground items-center justify-center border-dashed"
            onTrigger={() => fileInput?.click()}
            variant="outline"
          >
            <PlusIcon class="size-5" />
            <SoundPadLabel>Add</SoundPadLabel>
          </SoundPad>
        </SoundPadGrid>
      </Show>
      <input
        accept="audio/*"
        aria-label="Add audio files"
        class="hidden"
        multiple
        onChange={(event) => {
          addFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
        ref={(element) => {
          fileInput = element;
        }}
        type="file"
      />
    </div>
  );
};
