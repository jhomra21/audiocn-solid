import { useAudioContext } from "@/hooks/use-audio-context";
import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

export interface UseGainNodeOptions {
  input?: MediaStream | AudioNode | null;
  gain?: number;
  /** Omit for speakers, null for manual routing. */
  destination?: AudioNode | null;
  timeConstant?: number;
}

const disconnectFrom = (node: AudioNode, destination: AudioNode) => {
  try {
    node.disconnect(destination);
  } catch {
    // The source owner may already have disconnected this edge.
  }
};

/** A stable gain node. Options can be getters or an accessor. Null during SSR. */
export const useGainNode = (
  options: MaybeAccessor<UseGainNodeOptions> = {}
): GainNode | null => {
  const { context } = useAudioContext();
  const node = context?.createGain() ?? null;
  let started = false;

  createCompatEffect(
    () => {
      const current = readMaybeAccessor(options);

      return {
        gain: current.gain ?? 1,
        timeConstant: current.timeConstant ?? 0.01,
      };
    },
    ({ gain, timeConstant }) => {
      if (!(context && node)) return;

      if (started)
        node.gain.setTargetAtTime(gain, context.currentTime, timeConstant);
      else node.gain.setValueAtTime(gain, context.currentTime);
      started = true;
    }
  );

  createCompatEffect(
    () => readMaybeAccessor(options).input,
    (input) => {
      if (!(context && node && input)) return;
      const owned = input instanceof MediaStream;
      const source = owned ? context.createMediaStreamSource(input) : input;
      source.connect(node);

      return () => {
        if (owned) source.disconnect();
        else disconnectFrom(source, node);
      };
    }
  );

  createCompatEffect(
    () => readMaybeAccessor(options).destination,
    (destination) => {
      if (!(context && node)) return;

      const target =
        destination === undefined ? context.destination : destination;

      if (!target) return;
      node.connect(target);

      return () => disconnectFrom(node, target);
    }
  );

  return node;
};
