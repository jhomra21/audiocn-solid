import { expect, test } from "@playwright/test";

// These contracts need native output and touch even in the general release suite.
test.use({ hasTouch: true, launchOptions: {} });

interface AudioProbe {
  contexts: AudioContext[];
  media: HTMLAudioElement[];
  resumes: { before: string; active: boolean }[];
  plays: { active: boolean; error: string | null }[];
  outputs: GainNode[];
  speakerOutputs: Set<AudioNode>;
}

declare global {
  interface Window {
    safariAudioProbe: AudioProbe;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const probe: AudioProbe = {
      contexts: [],
      media: [],
      resumes: [],
      plays: [],
      outputs: [],
      speakerOutputs: new Set(),
    };

    window.safariAudioProbe = probe;
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        probe.contexts.push(this);
        const resume = this.resume.bind(this);
        this.resume = () => {
          probe.resumes.push({
            before: this.state,
            active: navigator.userActivation.isActive,
          });

          return resume();
        };

        const createGain = this.createGain.bind(this);
        this.createGain = () => {
          const gain = createGain();
          const connect = gain.connect.bind(gain);
          // SAFETY: the home page connects gains to AudioNodes, never AudioParams.
          gain.connect = ((destination: AudioNode) => {
            if (destination === this.destination)
              probe.speakerOutputs.add(gain);

            return connect(destination);
          }) as typeof gain.connect;

          return gain;
        };

        const createSource = this.createBufferSource.bind(this);
        this.createBufferSource = () => {
          const source = createSource();
          const connect = source.connect.bind(source);
          // SAFETY: useSound connects this source to one AudioNode, not an AudioParam.
          source.connect = ((destination: AudioNode) => {
            if (destination instanceof GainNode)
              probe.outputs.push(destination);

            return connect(destination);
          }) as typeof source.connect;

          return source;
        };
      }
    };
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(src?: string) {
        super(src);
        probe.media.push(this);
        const play = this.play.bind(this);
        this.play = () => {
          const call: AudioProbe["plays"][number] = {
            active: navigator.userActivation.isActive,
            error: null,
          };

          probe.plays.push(call);

          return play().catch((error: Error) => {
            call.error = `${error.name}: ${error.message}`;
            throw error;
          });
        };
      }
    };
  });
});

test.afterEach(async ({ page }, info) => {
  await info.attach("native-audio-observations", {
    body: JSON.stringify(
      await page.evaluate(() => {
        const probe = window.safariAudioProbe;

        return {
          contexts: probe.contexts.map((context) => ({
            state: context.state,
            currentTime: context.currentTime,
            sampleRate: context.sampleRate,
          })),
          media: probe.media.map((audio) => ({
            paused: audio.paused,
            currentTime: audio.currentTime,
            readyState: audio.readyState,
            muted: audio.muted,
            volume: audio.volume,
            error: audio.error?.code ?? null,
          })),
          resumes: probe.resumes,
          plays: probe.plays,
        };
      }),
      null,
      2
    ),
    contentType: "application/json",
  });
  await info.attach("page", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

for (const name of ["Music player", "Audio player"]) {
  test(`${name} starts native media on its first touch`, async ({ page }) => {
    await page.goto("/");
    const tile = page.getByRole("article", { name, exact: true });
    await tile.scrollIntoViewIfNeeded();
    const play = tile.getByRole("button", { name: "Play", exact: true });
    await play.scrollIntoViewIfNeeded();
    await expect(play).toBeEnabled();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.safariAudioProbe.media.filter(
              (audio) => audio.readyState >= HTMLMediaElement.HAVE_METADATA
            ).length
        )
      )
      .toBeGreaterThan(0);
    await play.tap();
    await expect(tile.locator('[data-slot="audio-player"]')).toHaveAttribute(
      "data-playing",
      ""
    );
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.max(
            ...window.safariAudioProbe.media.map((audio) => audio.currentTime)
          )
        )
      )
      .toBeGreaterThan(0.1);
    const plays = await page.evaluate(() => window.safariAudioProbe.plays);
    expect(plays).toContainEqual({ active: true, error: null });
    expect(plays.every((play) => play.error === null)).toBe(true);
    await tile.getByRole("button", { name: "Pause", exact: true }).tap();
  });
}

test("the recorded sound pad produces nonzero native samples through its speaker gain on first touch", async ({
  page,
}, info) => {
  await page.goto("/");
  const tile = page.getByRole("article", { name: "Sound pads", exact: true });
  await tile.scrollIntoViewIfNeeded();
  const pad = tile.getByRole("button", { name: "Work, work", exact: true });
  await pad.scrollIntoViewIfNeeded();
  await expect(pad).toBeEnabled();
  await pad.tap();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.safariAudioProbe.contexts.some(
          (context) => context.state === "running" && context.currentTime > 0
        )
      )
    )
    .toBe(true);

  const peak = await page.evaluate(async () => {
    const output = window.safariAudioProbe.outputs.at(-1)!;

    if (!window.safariAudioProbe.speakerOutputs.has(output))
      throw new Error("The sound output is not connected to the speakers");

    const analyser = output.context.createAnalyser();
    output.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let peak = 0;
    const deadline = performance.now() + 1500;

    while (performance.now() < deadline && peak === 0) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      analyser.getFloatTimeDomainData(samples);

      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    }

    output.disconnect(analyser);

    return peak;
  });

  expect(peak).toBeGreaterThan(0.001);
  await info.attach("native-output-peak", {
    body: JSON.stringify({ peak, physicalSpeakerVerified: false }),
    contentType: "application/json",
  });
});
