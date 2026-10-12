export interface ClickSoundOptions {
  tone?: {
    decayMs?: number;
    gain?: number;
    hz?: number;
  };
  noise?: {
    decayMs?: number;
    gain?: number;
  };
  lengthMs?: number;
  pitchSpread?: number;
  volume?: number;
}

export interface ClickPlayOptions {
  context: BaseAudioContext;
  destination?: AudioNode;
  resume?: () => Promise<void>;
}

export interface ClickSound {
  play: (options: ClickPlayOptions) => void;
}

const DEFAULTS = {
  tone: { hz: 4200, decayMs: 1.2, gain: 0.4 },
  noise: { decayMs: 0.4, gain: 0.6 },
  lengthMs: 6,
  pitchSpread: 0.04,
  volume: 0.12,
} satisfies Required<ClickSoundOptions>;

export const createClickSound = (
  options: ClickSoundOptions = {}
): ClickSound => {
  const tone = { ...DEFAULTS.tone, ...options.tone };
  const noise = { ...DEFAULTS.noise, ...options.noise };
  const lengthMs = options.lengthMs ?? DEFAULTS.lengthMs;
  const pitchSpread = options.pitchSpread ?? DEFAULTS.pitchSpread;
  const volume = options.volume ?? DEFAULTS.volume;
  const buffers = new WeakMap<BaseAudioContext, AudioBuffer>();
  const pendingContexts = new WeakMap<BaseAudioContext, number>();
  let lastPlayedAt = Number.NEGATIVE_INFINITY;

  const playNow = (context: BaseAudioContext, destination: AudioNode): void => {
    const now = performance.now();

    if (now - lastPlayedAt < 30 || context.state === "closed") return;

    lastPlayedAt = now;
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = bufferFor(context);
    source.playbackRate.value = 1 + (Math.random() - 0.5) * pitchSpread * 2;
    gain.gain.value = volume;
    source.connect(gain).connect(destination);
    source.addEventListener(
      "ended",
      () => {
        source.disconnect();
        gain.disconnect();
      },
      { once: true }
    );
    source.start();
  };

  const bufferFor = (context: BaseAudioContext): AudioBuffer => {
    const cached = buffers.get(context);

    if (cached) return cached;

    const { sampleRate } = context;

    const buffer = context.createBuffer(
      1,
      Math.ceil((lengthMs / 1000) * sampleRate),
      sampleRate
    );

    const samples = buffer.getChannelData(0);

    for (let index = 0; index < samples.length; index += 1) {
      const time = index / sampleRate;

      samples[index] =
        noise.gain *
          (Math.random() * 2 - 1) *
          Math.exp(-time / (noise.decayMs / 1000)) +
        tone.gain *
          Math.sin(2 * Math.PI * tone.hz * time) *
          Math.exp(-time / (tone.decayMs / 1000));
    }

    buffers.set(context, buffer);

    return buffer;
  };

  return {
    play: ({ context, destination = context.destination, resume }) => {
      const needsResume =
        context.state === "suspended" || context.state === "interrupted";

      const resumePromise = resume?.();

      if (!needsResume || !resumePromise) {
        playNow(context, destination);

        return;
      }

      pendingContexts.set(context, (pendingContexts.get(context) ?? 0) + 1);

      const settleResume = () => {
        const pending = pendingContexts.get(context);

        if (pending === undefined) return;

        if (context.state === "running") {
          pendingContexts.delete(context);
          playNow(context, destination);
        } else if (pending === 1) {
          pendingContexts.delete(context);
        } else {
          pendingContexts.set(context, pending - 1);
        }
      };

      void resumePromise.then(settleResume, settleResume);
    },
  };
};
