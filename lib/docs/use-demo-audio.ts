import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";

import {
  DEMO_SOUNDS,
  DEMO_TRACKS,
  renderDemoSound,
  renderDemoTrackUrl,
} from "@/lib/docs/demo-audio";
import { createCompatEffect } from "@/lib/solid/effect";

export interface DemoTrackSource {
  id: string;
  title: string;
  artist: string;
  duration: number;
  src: string;
}

export interface DemoSoundSource {
  id: string;
  label: string;
  hotkey: string;
  accent: string;
  src: AudioBuffer;
}

const renderTracks = () =>
  Promise.all(
    DEMO_TRACKS.map(async (track) => ({
      ...track,
      src: await renderDemoTrackUrl(track.id),
    }))
  );

const renderSounds = () =>
  Promise.all(
    DEMO_SOUNDS.map(async (sound) => ({
      ...sound,
      src: await renderDemoSound(sound.id),
    }))
  );

/** Docs-only synthesis, started after mount and cancelled on disposal. */
const useRendered = <T>(render: () => Promise<T[]>): Accessor<T[]> => {
  const [items, setItems] = createSignal<T[]>([]);
  createCompatEffect(
    () => render,
    (run) => {
      let cancelled = false;

      const load = async () => {
        try {
          const rendered = await run();

          if (!cancelled) setItems(rendered);
        } catch {
          // OfflineAudioContext is unavailable in some browsers.
        }
      };

      void load();

      return () => {
        cancelled = true;
      };
    }
  );

  return items;
};

export const useDemoTracks = (): Accessor<DemoTrackSource[]> =>
  useRendered(renderTracks);

export const useDemoSounds = (): Accessor<DemoSoundSource[]> =>
  useRendered(renderSounds);
