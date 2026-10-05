import { Show, createSignal } from "solid-js";

import {
  SoundPad,
  SoundPadGrid,
  SoundPadLabel,
  SoundPadProgress,
  SoundPadShortcut,
} from "@/components/ui/sound-pad";
import {
  TrackList,
  TrackListItem,
  TrackListItemActions,
  TrackListItemIndex,
  TrackListItemTitle,
} from "@/components/ui/track-list";
import { createFrameEmitter } from "@/lib/audio/frame-source";

export const SoundPadsApp = () => {
  const [mounted, setMounted] = createSignal(true);
  const [held, setHeld] = createSignal(false);
  const [toggle, setToggle] = createSignal(false);
  const [disabled, setDisabled] = createSignal(false);
  const [selected, setSelected] = createSignal(0);
  const [subscribers, setSubscribers] = createSignal(0);
  const emitter = createFrameEmitter<number>();

  const source = {
    subscribe(listener: (value: number) => void) {
      setSubscribers((count) => count + 1);
      const unsubscribe = emitter.subscribe(listener);

      return () => {
        unsubscribe();
        setSubscribers((count) => count - 1);
      };
    },
  };

  return (
    <main class="mx-auto grid max-w-xl gap-4 p-4">
      <h1>Sound pad contracts</h1>
      <Show when={mounted()}>
        <SoundPadGrid hotkeys hotkeyScope="global" columns={2}>
          <SoundPad
            aria-label="Hold pad"
            mode="hold"
            hotkey="1"
            playing={held()}
            disabled={disabled()}
            onTrigger={() => setHeld(true)}
            onStop={() => setHeld(false)}
          >
            <SoundPadShortcut />
            <SoundPadLabel>Hold</SoundPadLabel>
            <SoundPadProgress source={source} />
          </SoundPad>
          <SoundPad
            aria-label="Toggle pad"
            mode="toggle"
            hotkey="2"
            playing={toggle()}
            onTrigger={() => setToggle(true)}
            onStop={() => setToggle(false)}
          >
            <SoundPadShortcut />
            <SoundPadLabel>Toggle</SoundPadLabel>
          </SoundPad>
        </SoundPadGrid>
      </Show>
      <label>
        Typing <input aria-label="Typing" />
      </label>
      <output data-testid="held-playing">{String(held())}</output>
      <output data-testid="progress-subscribers">{subscribers()}</output>
      <button onClick={() => emitter.emit(0.5)}>Emit progress</button>
      <button onClick={() => setDisabled(true)}>Disable held pad</button>
      <button onClick={() => setMounted(false)}>Remove pads</button>
      <TrackList>
        <TrackListItem
          active={selected() === 1}
          playing={selected() === 1}
          onSelect={() => setSelected(1)}
        >
          <TrackListItemIndex>1</TrackListItemIndex>
          <TrackListItemTitle>First track</TrackListItemTitle>
          <TrackListItemActions>
            <button>Track action</button>
          </TrackListItemActions>
        </TrackListItem>
        <TrackListItem disabled>
          <TrackListItemIndex>2</TrackListItemIndex>
          <TrackListItemTitle>Unavailable track</TrackListItemTitle>
        </TrackListItem>
        <TrackListItem
          active={selected() === 3}
          onSelect={() => setSelected(3)}
        >
          <TrackListItemIndex>3</TrackListItemIndex>
          <TrackListItemTitle>Third track</TrackListItemTitle>
        </TrackListItem>
      </TrackList>
      <output data-testid="selected-track">{selected()}</output>
    </main>
  );
};
