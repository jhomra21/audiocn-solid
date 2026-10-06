import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { HookLab } from "@/app/hooks-lab";
import type { UseAudioDevicesResult } from "@/hooks/use-audio-devices";
import type { AudioPlayerController } from "@/hooks/use-audio-player";
import type { ClipHold } from "@/hooks/use-clip-hold";
import type { UseMicrophoneResult } from "@/hooks/use-microphone";
import type { Mixer, MixerState } from "@/hooks/use-mixer";
import type { SoundController } from "@/hooks/use-sound";
import type { UseSystemAudioResult } from "@/hooks/use-system-audio";
import { dbToGain, gainToDb } from "@/lib/audio/decibels";
import type { createFrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame, VisualFrame } from "@/lib/audio/types";

import { advance, installFrameHarness, pendingTimers } from "./frame-harness";

type Lib = HookLab["lib"];

type DemoSignal = ReturnType<Lib["createDemoSignal"]>;

type DemoMixer = ReturnType<Lib["createDemoMixer"]>;

type FrameEmitter<T> = ReturnType<typeof createFrameEmitter<T>>;

const BASE_MIXER: MixerState = {
  channels: [
    { gainDb: 0, id: "mic", monitor: false, muted: false, pan: 0, solo: false },
    {
      gainDb: -6,
      id: "music",
      monitor: true,
      muted: false,
      pan: 0,
      solo: false,
    },
  ],
  master: { gainDb: 0, muted: false },
};

const MIX_CHANNELS = [
  { id: "mono", kind: "tone" },
  { channels: 2, id: "stereo", kind: "tone", seed: 3 },
] as const;

const DEVICES = [
  {
    deviceId: "default",
    groupId: "g",
    kind: "audioinput",
    label: "Default - Built-in",
  },
  { deviceId: "usb", groupId: "u", kind: "audioinput", label: "USB mic" },
  { deviceId: "cam", groupId: "c", kind: "videoinput", label: "Camera" },
] as const;

const SILENCE = Number.NEGATIVE_INFINITY;

const openLab = async (page: Page) => {
  await page.goto("/hooks-lab");
  await page.waitForFunction(() => "lab" in window);
};

/** The lab on a page whose frames and timers only move when a test says so. */
const openTimedLab = async (page: Page) => {
  await installFrameHarness(page);
  await openLab(page);
};

const seen = <T>(page: Page, name: string) =>
  page.evaluate((key) => window.lab.seen<T>(key), name);

export const runHooksSuite = () => {
  test.describe("hook contracts", () => {
    test.describe("mixer state", () => {
      test("patches one channel and clamps pan", async ({ page }) => {
        await openLab(page);

        const result = await page.evaluate((base) => {
          const next = window.lab.lib.mixerReducer(base, {
            id: "mic",
            patch: { pan: 3 },
            type: "channel",
          });

          return {
            otherChannelUntouched: next.channels[1] === base.channels[1],
            pan: next.channels[0]?.pan,
          };
        }, BASE_MIXER);

        expect(result).toEqual({ otherChannelUntouched: true, pan: 1 });
      });

      test("solos exclusively when asked", async ({ page }) => {
        await openLab(page);

        const solos = await page.evaluate((base) => {
          const { mixerReducer } = window.lab.lib;

          const soloed = mixerReducer(base, {
            exclusive: false,
            id: "mic",
            solo: true,
            type: "solo",
          });

          const exclusive = mixerReducer(soloed, {
            exclusive: true,
            id: "music",
            solo: true,
            type: "solo",
          });

          return exclusive.channels.map((channel) => channel.solo);
        }, BASE_MIXER);

        expect(solos).toEqual([false, true]);
      });

      test("adds and removes channels", async ({ page }) => {
        await openLab(page);

        const result = await page.evaluate((base) => {
          const { mixerReducer } = window.lab.lib;

          const added = mixerReducer(base, {
            channel: { id: "system" },
            type: "add",
          });

          const again = mixerReducer(added, {
            channel: { id: "system" },
            type: "add",
          });

          return {
            duplicateIsSameState: again === added,
            last: added.channels.at(-1),
            remaining: mixerReducer(added, { id: "mic", type: "remove" })
              .channels.length,
          };
        }, BASE_MIXER);

        expect(result.last).toMatchObject({
          gainDb: 0,
          id: "system",
          muted: false,
        });
        expect(result.duplicateIsSameState).toBe(true);
        expect(result.remaining).toBe(2);
      });

      test("silences muted channels and channels outside a solo", async ({
        page,
      }) => {
        await openLab(page);

        const heard = await page.evaluate((base) => {
          const { isChannelAudible, mixerReducer } = window.lab.lib;

          const muted = mixerReducer(base, {
            id: "mic",
            patch: { muted: true },
            type: "channel",
          });

          const soloed = mixerReducer(base, {
            exclusive: false,
            id: "music",
            solo: true,
            type: "solo",
          });

          return {
            micInSolo: isChannelAudible(soloed, "mic"),
            muted: isChannelAudible(muted, "mic"),
            musicInSolo: isChannelAudible(soloed, "music"),
          };
        }, BASE_MIXER);

        expect(heard).toEqual({
          micInSolo: false,
          muted: false,
          musicInSolo: true,
        });
      });

      test("manages state and reports dimmed channels", async ({ page }) => {
        await openLab(page);

        const result = await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("mixer", () =>
            lab.lib.useMixer({ channels: [{ id: "a" }, { id: "b" }] })
          );
          await lab.settle();
          lab.use("mixer", (mixer: Mixer) => {
            mixer.setGain("a", -12);
            mixer.setSolo("b", true);
          });
          await lab.settle();

          const changed = lab.use("mixer", (mixer: Mixer) => ({
            aDimmed: mixer.isDimmed("a"),
            aGain: mixer.channel("a")?.gainDb,
            bAudible: mixer.isAudible("b"),
          }));

          lab.use("mixer", (mixer: Mixer) => mixer.reset());
          await lab.settle();

          return {
            changed,
            resetGain: lab.use(
              "mixer",
              (mixer: Mixer) => mixer.channel("a")?.gainDb
            ),
          };
        });

        expect(result).toEqual({
          changed: { aDimmed: true, aGain: -12, bAudible: true },
          resetGain: 0,
        });
      });

      test("works controlled", async ({ page }) => {
        await openLab(page);

        const result = await page.evaluate(async (base) => {
          const { lab } = window;
          const changes: MixerState[] = [];

          lab.mount("mixer", () =>
            lab.lib.useMixer({
              onStateChange: (state) => changes.push(state),
              state: base,
            })
          );
          await lab.settle();
          lab.use("mixer", (mixer: Mixer) => mixer.setMuted("mic", true));
          await lab.settle();

          return {
            notified: changes.map(
              (state) =>
                state.channels.find((channel) => channel.id === "mic")?.muted
            ),
            shownMuted: lab.use(
              "mixer",
              (mixer: Mixer) => mixer.channel("mic")?.muted
            ),
          };
        }, BASE_MIXER);

        expect(result).toEqual({ notified: [true], shownMuted: false });
      });

      test("persists to localStorage", async ({ page }) => {
        await openLab(page);

        const saved = await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("mixer", () =>
            lab.lib.useMixer({
              channels: [{ id: "a" }],
              persistKey: "test-mixer",
            })
          );
          await lab.settle();
          lab.use("mixer", (mixer: Mixer) => mixer.setGain("a", -3));
          await lab.settle();

          return JSON.parse(localStorage.getItem("test-mixer") ?? "{}");
        });

        expect(saved.channels[0].gainDb).toBe(-3);
      });

      test("restores saved state when remounted without overwriting it", async ({
        page,
      }) => {
        await openLab(page);

        const result = await page.evaluate(async () => {
          const { lab } = window;

          const options = {
            channels: [{ id: "a" }],
            persistKey: "restored-mixer",
          };

          lab.mount("first", () => lab.lib.useMixer(options));
          await lab.settle();
          lab.use("first", (mixer: Mixer) => mixer.setGain("a", -9));
          await lab.settle();
          lab.unmount("first");
          // A remount that mounts, unmounts and mounts again, as a development
          // double-run does, must still read the saved state.
          lab.mount("second", () => lab.lib.useMixer(options));
          await lab.settle();
          lab.unmount("second");
          lab.mount("third", () => lab.lib.useMixer(options));
          await lab.settle();

          return {
            restored: lab.use(
              "third",
              (mixer: Mixer) => mixer.channel("a")?.gainDb
            ),
            saved: JSON.parse(localStorage.getItem("restored-mixer") ?? "{}"),
          };
        });

        expect(result.restored).toBe(-9);
        expect(result.saved.channels[0].gainDb).toBe(-9);
      });
    });

    test.describe("frame sources over time", () => {
      test("useLevel samples a source at its interval", async ({ page }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          const emitter = lab.lib.createFrameEmitter<MeterFrame>();
          lab.mount("level", () =>
            lab.lib.useLevel(emitter, { intervalMs: 100 })
          );
          await lab.settle();
          emitter.emit({ channels: [{ peakDb: -6, rmsDb: -12 }] });
        });
        await advance(page, 120);

        const level = await page.evaluate(() =>
          window.lab.use("level", (state: ReturnType<Lib["useLevel"]>) => ({
            peakDb: state.peakDb,
            rmsDb: state.rmsDb,
            zone: state.zone,
          }))
        );

        expect(level).toEqual({ peakDb: -6, rmsDb: -12, zone: "clip" });
      });

      test("useLevel changes its sampling cadence when the interval option changes", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          const emitter = lab.lib.createFrameEmitter<MeterFrame>();
          lab.mount("level", () => {
            const [intervalMs, setIntervalMs] = lab.signal(250);

            return {
              emitter,
              level: lab.lib.useLevel(emitter, () => ({
                intervalMs: intervalMs(),
              })),
              setIntervalMs,
            };
          });
          await lab.settle();
        });

        const send = (peakDb: number) =>
          page.evaluate((value) => {
            window.lab.use(
              "level",
              (state: { emitter: FrameEmitter<MeterFrame> }) =>
                state.emitter.emit({ channels: [{ peakDb: value }] })
            );
          }, peakDb);

        const peak = () =>
          page.evaluate(() =>
            window.lab.use(
              "level",
              (state: { level: ReturnType<Lib["useLevel"]> }) =>
                state.level.peakDb
            )
          );

        expect(await pendingTimers(page)).toBe(1);
        await send(-30);
        await advance(page, 249);
        expect(await peak()).toBe(SILENCE);
        await advance(page, 1);
        expect(await peak()).toBe(-30);

        await page.evaluate(async () => {
          window.lab.use(
            "level",
            (state: { setIntervalMs: (value: number) => void }) =>
              state.setIntervalMs(100)
          );
          await window.lab.settle();
        });
        expect(await pendingTimers(page)).toBe(1);
        await send(-20);
        await advance(page, 99);
        expect(await peak()).toBe(-30);
        await advance(page, 1);
        expect(await peak()).toBe(-20);
        await send(-10);
        await advance(page, 100);
        expect(await peak()).toBe(-10);
        expect(await pendingTimers(page)).toBe(1);
        await page.evaluate(() => window.lab.unmount("level"));
        expect(await pendingTimers(page)).toBe(0);
      });

      test("useClipHold counts separate clips and releases after the hold", async ({
        page,
      }) => {
        await openTimedLab(page);

        const clips = await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("clip", () => lab.lib.useClipHold({ holdMs: 200 }));
          await lab.settle();
          lab.use("clip", (clip: ClipHold) => {
            for (const db of [0, 0, -20, -0.5]) clip.report(db);
          });
          await lab.settle();

          return lab.use("clip", (clip: ClipHold) => ({
            clipping: clip.clipping,
            count: clip.count,
          }));
        });

        expect(clips).toEqual({ clipping: true, count: 2 });
        await advance(page, 250);
        expect(
          await page.evaluate(() =>
            window.lab.use("clip", (clip: ClipHold) => clip.clipping)
          )
        ).toBe(false);
      });

      test("useClipHold drops its release timer when its owner goes away mid-hold", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("clip", () => lab.lib.useClipHold({ holdMs: 1000 }));
          await lab.settle();
          lab.use("clip", (clip: ClipHold) => clip.report(0));
          await lab.settle();
        });
        expect(await pendingTimers(page)).toBe(1);
        await page.evaluate(() => window.lab.unmount("clip"));
        expect(await pendingTimers(page)).toBe(0);
      });

      test("useClipHold keeps counting down while its hidden wrapper stays mounted", async ({
        page,
      }) => {
        await openTimedLab(page);

        const hide = (hidden: boolean) =>
          page.evaluate((value) => {
            const wrapper = document.querySelector<HTMLElement>("#retained");

            if (wrapper) wrapper.hidden = value;
          }, hidden);

        const clipping = () =>
          page.evaluate(() =>
            window.lab.use("clip", (clip: ClipHold) => clip.clipping)
          );

        await page.evaluate(async () => {
          const { lab } = window;

          const wrapper = document.body.appendChild(
            document.createElement("div")
          );

          wrapper.id = "retained";
          lab.mount("clip", () => lab.lib.useClipHold({ holdMs: 1000 }));
          await lab.settle();
          lab.use("clip", (clip: ClipHold) => clip.report(0));
          await lab.settle();
        });
        expect(await clipping()).toBe(true);
        await hide(true);
        // Hiding the wrapper does not dispose the owner: the release is still due.
        expect(await pendingTimers(page)).toBe(1);
        await hide(false);
        await advance(page, 1500);
        expect(await clipping()).toBe(false);
        expect(await pendingTimers(page)).toBe(0);
      });

      test("useFrameSource hands frames to the latest callback without resubscribing", async ({
        page,
      }) => {
        await openLab(page);

        const result = await page.evaluate(async () => {
          const { lab } = window;
          const emitter = lab.lib.createFrameEmitter<number>();
          const received: string[] = [];
          let subscribes = 0;

          const source = {
            subscribe: (listener: (frame: number) => void) => {
              subscribes += 1;

              return emitter.subscribe(listener);
            },
          };

          lab.mount("frames", () => {
            const [label, setLabel] = lab.signal("first");
            lab.lib.useFrameSource(source, (frame) =>
              received.push(`${label()}:${frame}`)
            );

            return setLabel;
          });
          await lab.settle();
          lab.use("frames", (setLabel: (label: string) => void) =>
            setLabel("second")
          );
          await lab.settle();
          emitter.emit(1);

          return { received, subscribes };
        });

        expect(result).toEqual({ received: ["second:1"], subscribes: 1 });
      });

      test("useFrameSource keeps its subscription while its options are re-read unchanged", async ({
        page,
      }) => {
        await openLab(page);

        const subscribes = await page.evaluate(async () => {
          const { lab } = window;
          const emitter = lab.lib.createFrameEmitter<number>();
          let count = 0;

          const source = {
            subscribe: (listener: (frame: number) => void) => {
              count += 1;

              return emitter.subscribe(listener);
            },
          };

          lab.mount("frames", () => {
            const [reads, setReads] = lab.signal(0);
            lab.lib.useFrameSource(
              () => source,
              () => {},
              () => {
                reads();

                return { enabled: true };
              }
            );

            return setReads;
          });
          await lab.settle();
          lab.use("frames", (setReads: (value: number) => void) => setReads(1));
          await lab.settle();

          return count;
        });

        expect(subscribes).toBe(1);
      });

      test("useLevel keeps sampling while its options are re-read with inline zones", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          const emitter = lab.lib.createFrameEmitter<MeterFrame>();

          lab.mount("level", () => {
            const [reads, setReads] = lab.signal(0);

            // A new zones array and a new read on every update, as an inline
            // option that depends on a busy signal would be.
            const level = lab.lib.useLevel(emitter, () => {
              reads();

              return {
                intervalMs: 250,
                zones: [{ fromDb: Number.NEGATIVE_INFINITY, zone: "ok" }],
              };
            });

            return { level, setReads };
          });
          await lab.settle();
          emitter.emit({ channels: [{ peakDb: -6, rmsDb: -12 }] });
        });

        for (let step = 1; step <= 6; step += 1) {
          await advance(page, 50);
          await page.evaluate(async (next) => {
            window.lab.use(
              "level",
              (state: { setReads: (value: number) => void }) =>
                state.setReads(next)
            );
            await window.lab.settle();
          }, step);
        }

        expect(
          await page.evaluate(() =>
            window.lab.use(
              "level",
              (state: { level: ReturnType<Lib["useLevel"]> }) =>
                state.level.peakDb
            )
          )
        ).toBe(-6);
      });

      test("createFrameRelay keeps subscribers across source changes", async ({
        page,
      }) => {
        await openLab(page);

        const values = await page.evaluate(() => {
          const { createFrameEmitter, createFrameRelay } = window.lab.lib;
          const relay = createFrameRelay<number>();
          const first = createFrameEmitter<number>();
          const second = createFrameEmitter<number>();
          const received: number[] = [];
          relay.subscribe((value) => received.push(value));
          relay.setSource(first);
          first.emit(1);
          relay.setSource(second);
          first.emit(2);
          second.emit(3);

          return received;
        });

        expect(values).toEqual([1, 3]);
      });
    });

    test.describe("demo signal", () => {
      test("createDemoSignal emits frames only while subscribed", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("signal", () =>
            lab.lib.createDemoSignal({ channels: 2, kind: "tone" })
          );
          await lab.settle();
          lab.watch(
            "meter",
            lab.use("signal", (signal: DemoSignal) => signal.meter)
          );
        });
        await advance(page, 100);

        const frame = await seen<MeterFrame>(page, "meter");

        expect(frame.count).toBeGreaterThan(0);
        expect(frame.last.channels).toHaveLength(2);
        expect(frame.last.channels[0]?.peakDb).toBeCloseTo(-12, 0);
        await page.evaluate(() => {
          window.lab.unwatch("meter");
          window.lab.resetSeen("meter");
        });
        await advance(page, 100);
        expect((await seen<MeterFrame>(page, "meter")).count).toBe(0);
        expect(await pendingTimers(page)).toBe(0);
      });

      test("applies gain to stereo peak, RMS, bands, history and waveform without clipping boosts", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("dry", () =>
            lab.lib.createDemoSignal({ channels: 2, kind: "tone" })
          );
          lab.mount("wet", () =>
            lab.lib.createDemoSignal({ channels: 2, gainDb: -6, kind: "tone" })
          );
          await lab.settle();
          lab.watch(
            "dryMeter",
            lab.use("dry", (signal: DemoSignal) => signal.meter)
          );
          lab.watch(
            "wetMeter",
            lab.use("wet", (signal: DemoSignal) => signal.meter)
          );
          lab.watch(
            "dryVisual",
            lab.use("dry", (signal: DemoSignal) => signal.visual)
          );
          lab.watch(
            "wetVisual",
            lab.use("wet", (signal: DemoSignal) => signal.visual)
          );
        });
        await advance(page, 100);

        const dryMeter = (await seen<MeterFrame>(page, "dryMeter")).last;
        const wetMeter = (await seen<MeterFrame>(page, "wetMeter")).last;
        const dryVisual = (await seen<VisualFrame>(page, "dryVisual")).last;
        const wetVisual = (await seen<VisualFrame>(page, "wetVisual")).last;

        for (const side of [0, 1]) {
          const input = dryMeter.channels[side];
          const output = wetMeter.channels[side];
          expect(output?.peakDb).toBeCloseTo((input?.peakDb ?? NaN) - 6);
          expect(output?.rmsDb).toBeCloseTo((input?.rmsDb ?? 0) - 6);
        }

        expect(wetVisual.peakDb).toBeCloseTo(dryVisual.peakDb - 6);
        expect(wetVisual.bands[0]).toBeLessThan(dryVisual.bands[0] ?? NaN);
        expect(wetVisual.history[0]).toBeLessThan(dryVisual.history[0] ?? NaN);
        expect(wetVisual.timeDomain?.[1]).toBeCloseTo(
          (dryVisual.timeDomain?.[1] ?? 0) * 10 ** (-6 / 20)
        );

        await page.evaluate(async () => {
          window.lab.use("wet", (signal: DemoSignal) =>
            signal.configure({ gainDb: 18 })
          );
          await window.lab.settle();
        });
        await advance(page, 16);
        expect(
          (await seen<MeterFrame>(page, "wetMeter")).last.channels[0]?.peakDb
        ).toBeCloseTo(6);
        expect(
          (await seen<VisualFrame>(page, "wetVisual")).last.peakDb
        ).toBeCloseTo(
          (await seen<VisualFrame>(page, "dryVisual")).last.peakDb + 18
        );

        await page.evaluate(async () => {
          window.lab.use("wet", (signal: DemoSignal) =>
            signal.configure({ gainDb: Number.NEGATIVE_INFINITY })
          );
          await window.lab.settle();
        });
        await advance(page, 64);
        expect(
          (await seen<MeterFrame>(page, "wetMeter")).last.channels
        ).toEqual([
          { peakDb: SILENCE, rmsDb: SILENCE },
          { peakDb: SILENCE, rmsDb: SILENCE },
        ]);

        const silent = (await seen<VisualFrame>(page, "wetVisual")).last;

        expect(silent.bands.every((value) => value === 0)).toBe(true);
        expect(silent.timeDomain?.every((value) => value === 0)).toBe(true);
      });

      test("updates hook gain without replacing sources or resetting the signal pattern", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;

          lab.mount("hook", () => {
            const [gainDb, setGainDb] = lab.signal(0);

            const signal = lab.lib.useDemoSignal({
              get gainDb() {
                return gainDb();
              },
              kind: "music",
              seed: 4,
            });

            return { setGainDb, signal };
          });
          lab.mount("reference", () =>
            lab.lib.createDemoSignal({ kind: "music", seed: 4 })
          );
          await lab.settle();
          lab.watch(
            "input",
            lab.use("reference", (signal: DemoSignal) => signal.meter)
          );
          lab.watch(
            "output",
            lab.use(
              "hook",
              (state: { signal: DemoSignal }) => state.signal.meter
            )
          );
        });
        await advance(page, 320);
        await page.evaluate(async () => {
          window.lab.use(
            "hook",
            (state: { setGainDb: (value: number) => void }) =>
              state.setGainDb(-12)
          );
          await window.lab.settle();
        });
        await advance(page, 16);

        const input = (await seen<MeterFrame>(page, "input")).last;
        const output = await seen<MeterFrame>(page, "output");

        expect(output.last.channels[0]?.peakDb).toBeCloseTo(
          (input.channels[0]?.peakDb ?? NaN) - 12
        );
        // The same subscription kept receiving frames through the change.
        expect(output.count).toBeGreaterThan(20);
      });

      test("keeps the sample clock when the demo history size changes", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("signal", () =>
            lab.lib.createDemoSignal({ historySize: 2 })
          );
          await lab.settle();
          lab.watch(
            "visual",
            lab.use("signal", (signal: DemoSignal) => signal.visual)
          );
        });
        await advance(page, 208);
        expect(
          (await seen<VisualFrame>(page, "visual")).last.historyPreviousLevel
        ).toBeDefined();

        await page.evaluate(async () => {
          window.lab.use("signal", (signal: DemoSignal) =>
            signal.configure({ historyIntervalMs: 100, historySize: 4 })
          );
          await window.lab.settle();
        });
        await advance(page, 16);
        expect(
          (await seen<VisualFrame>(page, "visual")).last.historyLength
        ).toBe(0);

        await advance(page, 80);

        const frame = (await seen<VisualFrame>(page, "visual")).last;

        expect(frame).toMatchObject({
          historyIntervalMs: 100,
          historyLength: 1,
          historyStart: 0,
        });
        expect(frame.historyPreviousLevel).toBeUndefined();
        expect(frame.historyUpdatedAt).toBeCloseTo(304, -1);
      });
    });

    test.describe("built-in history timing", () => {
      type Timing = { count: number; interval?: number; time?: number };

      for (const kind of ["demo", "analyser"] as const) {
        test(`${kind} sends history timing and keeps the sample schedule`, async ({
          page,
        }) => {
          await openTimedLab(page);
          await page.evaluate((source) => {
            const { lab } = window;
            const history = lab.createHistorySource(source);
            lab.collect("timing", history.visual, (frame) => ({
              count: frame.historyLength,
              interval: frame.historyIntervalMs,
              time: frame.historyUpdatedAt,
            }));
          }, kind);
          await advance(page, 1024);

          const frames = await page.evaluate(() =>
            window.lab.collectedFrames<Timing>("timing")
          );

          const samples = frames.filter((frame) => frame.count > 0);

          expect(frames[0]?.count).toBe(0);
          expect(samples[0]).toEqual({ count: 1, interval: 50, time: 64 });
          expect(samples.at(-1)).toEqual({
            count: 16,
            interval: 50,
            time: 1024,
          });
          expect(new Set(samples.map((frame) => frame.time)).size).toBe(16);
          expect(frames.length).toBeGreaterThan(16);
          await page.evaluate(() => window.lab.stopCollecting("timing"));
          expect(await pendingTimers(page)).toBe(0);
        });

        test(`${kind} skips missed samples when frames are throttled and resumes its cadence`, async ({
          page,
        }) => {
          await openTimedLab(page);

          const read = (nowMs: number) =>
            page.evaluate((time) => {
              window.lab.tick(time);

              return window.lab.lastFrame<Timing>("timing");
            }, nowMs);

          await page.evaluate((source) => {
            const { lab } = window;
            lab.holdFrames();

            const history = lab.createHistorySource(source);
            lab.collect("timing", history.visual, (frame) => ({
              count: frame.historyLength,
              time: frame.historyUpdatedAt,
            }));
          }, kind);

          for (const nowMs of [16, 80, 1017, 2018]) await read(nowMs);
          expect(await read(100_019)).toEqual({ count: 4, time: 100_019 });
          expect((await read(100_035))?.count).toBe(4);
          expect(await read(100_083)).toEqual({ count: 5, time: 100_083 });
        });
      }
    });

    test.describe("demo mixer", () => {
      test("mixes current post-fader channels in linear units and applies master gain once", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async (channels) => {
          const { lab } = window;

          lab.mount("mix", () => {
            const mixer = lab.lib.useMixer({
              channels: [{ id: "mono" }, { gainDb: -6, id: "stereo" }],
            });

            return {
              demo: lab.lib.useDemoMixer(channels, () => mixer.state),
              mixer,
            };
          });

          await lab.settle();

          const demo = lab.use(
            "mix",
            (state: { demo: DemoMixer }) => state.demo
          );

          // The master alone must start every upstream source.
          lab.watch("master", demo.master);
          lab.watch("mono", demo.sources.mono);
          lab.watch("stereo", demo.sources.stereo);
        }, MIX_CHANNELS);
        await advance(page, 16);

        const frames = async () => ({
          master: (await seen<MeterFrame>(page, "master")).last,
          mono: (await seen<MeterFrame>(page, "mono")).last,
          stereo: (await seen<MeterFrame>(page, "stereo")).last,
        });

        const act = (change: string) =>
          page.evaluate(async (name) => {
            window.lab.use("mix", (state: { mixer: Mixer }) => {
              const { mixer } = state;

              if (name === "mix") {
                mixer.setGain("mono", -8);
                mixer.setMuted("stereo", true);
                mixer.setMasterGain(-4);
              } else if (name === "solo") {
                mixer.setMuted("stereo", false);
                mixer.setSolo("mono", true);
              } else if (name === "mute mono") {
                mixer.setMuted("mono", true);
              } else if (name === "mute master") {
                mixer.setMuted("mono", false);
                mixer.setMasterMuted(true);
              } else {
                mixer.setMasterMuted(false);
                mixer.setMasterGain(Number.NEGATIVE_INFINITY);
              }
            });
            await window.lab.settle();
          }, change);

        let now = await frames();
        expect(now.mono.channels[0]?.peakDb).toBeCloseTo(-12);
        expect(now.stereo.channels[0]?.peakDb).toBeCloseTo(-18);

        for (const side of [0, 1]) {
          const input = now.stereo.channels[side];
          const output = now.master.channels[side];
          expect(output?.peakDb).toBeCloseTo(
            gainToDb(dbToGain(-12) + dbToGain(input?.peakDb ?? SILENCE))
          );
          expect(output?.rmsDb).toBeCloseTo(
            gainToDb(Math.hypot(dbToGain(-15.01), dbToGain(input?.rmsDb ?? 0)))
          );
        }

        await act("mix");
        await advance(page, 16);
        now = await frames();
        expect(now.mono.channels[0]?.peakDb).toBeCloseTo(-20);

        for (const level of now.master.channels) {
          expect(level.peakDb).toBeCloseTo(-24);
          expect(level.rmsDb).toBeCloseTo(-27.01);
        }

        await act("solo");
        await advance(page, 16);
        now = await frames();
        expect(now.stereo.channels[0]?.peakDb).toBe(SILENCE);
        expect(now.master.channels[0]?.peakDb).toBeCloseTo(-24);

        await act("mute mono");
        await advance(page, 16);
        expect((await frames()).master.channels[0]?.peakDb).toBe(SILENCE);

        await act("mute master");
        await advance(page, 16);
        now = await frames();
        expect(now.master.channels[0]?.peakDb).toBe(SILENCE);
        expect(now.mono.channels[0]?.peakDb).toBeCloseTo(-20);

        await act("silent master");
        await advance(page, 16);
        expect((await frames()).master.channels[0]?.peakDb).toBe(SILENCE);
      });

      test("shares upstream subscriptions and stops and restarts with the last master subscriber", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async (channels) => {
          const { lab } = window;
          lab.mount("demo", () => lab.lib.createDemoMixer(channels));
          await lab.settle();

          const { master } = lab.use("demo", (demo: DemoMixer) => demo);
          lab.watch("first", master);
          lab.watch("second", master);
        }, MIX_CHANNELS);
        await advance(page, 32);
        expect((await seen<MeterFrame>(page, "first")).count).toBe(2);
        expect((await seen<MeterFrame>(page, "second")).count).toBe(2);

        await page.evaluate(() => window.lab.unwatch("first"));
        await advance(page, 16);
        expect((await seen<MeterFrame>(page, "second")).count).toBe(3);

        await page.evaluate(() => window.lab.unwatch("second"));
        expect(await pendingTimers(page)).toBe(0);

        await page.evaluate(() => {
          const { lab } = window;
          lab.watch(
            "again",
            lab.use("demo", (demo: DemoMixer) => demo.master)
          );
        });
        await advance(page, 16);

        const again = await seen<MeterFrame>(page, "again");

        expect(again.count).toBe(1);
        expect(again.last.channels[0]?.peakDb).toBeGreaterThan(-12);
        await page.evaluate(() => window.lab.unwatch("again"));
        expect(await pendingTimers(page)).toBe(0);
      });

      test("emits stereo silence for an empty mixer", async ({ page }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          lab.mount("demo", () => lab.lib.createDemoMixer([]));
          await lab.settle();
          lab.watch(
            "master",
            lab.use("demo", (demo: DemoMixer) => demo.master)
          );
        });
        await advance(page, 16);
        expect((await seen<MeterFrame>(page, "master")).last.channels).toEqual([
          { peakDb: SILENCE, rmsDb: SILENCE },
          { peakDb: SILENCE, rmsDb: SILENCE },
        ]);
      });
    });

    test.describe("gain node", () => {
      test("starts at its gain, then ramps later changes", async ({ page }) => {
        await openLab(page);

        const result = await page.evaluate(async () => {
          const { lab } = window;
          const audio = lab.createFakeAudio();

          lab.mount(
            "gain",
            () => {
              const [gain, setGain] = lab.signal(0);
              lab.lib.useGainNode(() => ({ destination: null, gain: gain() }));

              return setGain;
            },
            audio.context
          );
          await lab.settle();

          const [node] = audio.gains;

          const start = {
            ramps: node?.gain.setTargetAtTime.calls.length,
            set: node?.gain.setValueAtTime.calls[0],
          };

          lab.use("gain", (setGain: (value: number) => void) => setGain(0.5));
          await lab.settle();

          return { start, ramped: node?.gain.setTargetAtTime.calls };
        });

        expect(result.start).toEqual({ ramps: 0, set: [0, 0] });
        expect(result.ramped).toEqual([[0.5, 0, 0.01]]);
      });

      test("wires a stream to the speakers and undoes it on unmount", async ({
        page,
      }) => {
        await openLab(page);

        const result = await page.evaluate(async () => {
          const { lab } = window;
          const audio = lab.createFakeAudio();
          const stream = new MediaStream();

          lab.mount(
            "gain",
            () => lab.lib.useGainNode({ input: stream }),
            audio.context
          );
          await lab.settle();

          const [node] = audio.gains;
          const [source] = audio.streamSources;

          const wired = {
            seenStream: audio.streamsSeen[0] === stream,
            sourceToNode: source?.connect.calls[0]?.[0] === node,
            nodeToSpeakers: node?.connect.calls[0]?.[0] === audio.destination,
          };

          lab.unmount("gain");

          return {
            wired,
            undone: {
              sourceDisconnected: source?.disconnect.calls.length,
              nodeFromSpeakers:
                node?.disconnect.calls[0]?.[0] === audio.destination,
            },
          };
        });

        expect(result.wired).toEqual({
          nodeToSpeakers: true,
          seenStream: true,
          sourceToNode: true,
        });
        expect(result.undone).toEqual({
          nodeFromSpeakers: true,
          sourceDisconnected: 1,
        });
      });

      test("routes nowhere with a null destination", async ({ page }) => {
        await openLab(page);

        const connects = await page.evaluate(async () => {
          const { lab } = window;
          const audio = lab.createFakeAudio();
          lab.mount(
            "gain",
            () => lab.lib.useGainNode({ destination: null }),
            audio.context
          );
          await lab.settle();

          return audio.gains[0]?.connect.calls.length;
        });

        expect(connects).toBe(0);
      });
    });

    test.describe("sound progress", () => {
      test("reports progress from the voice, not from options changed mid-play", async ({
        page,
      }) => {
        await openTimedLab(page);
        await page.evaluate(async () => {
          const { lab } = window;
          const audio = lab.createFakeAudio();
          const buffer = new AudioBuffer({ length: 8000, sampleRate: 8000 });

          lab.mount(
            "sound",
            () => {
              const [loop, setLoop] = lab.signal(true);
              const sound = lab.lib.useSound(buffer, () => ({ loop: loop() }));
              lab.watch("progress", sound.progress);

              return { setLoop, sound };
            },
            audio.context
          );
          await lab.settle();
          lab.use("sound", (state: { sound: SoundController }) =>
            state.sound.play()
          );
          await lab.settle();
          // The pad switches mode while the looping voice keeps playing.
          lab.use("sound", (state: { setLoop: (value: boolean) => void }) =>
            state.setLoop(false)
          );
          await lab.settle();
          audio.clock.now = 1.5;
        });
        await advance(page, 20);

        expect((await seen<number>(page, "progress")).last).toBeCloseTo(0.5);
      });
    });

    test.describe("browser device hooks", () => {
      test("useAudioDevices lists audio inputs and marks the default", async ({
        page,
      }) => {
        await openLab(page);
        await page.evaluate((devices) => {
          const { lab } = window;
          lab.mockMedia([...devices]);
          lab.mount("devices", () => lab.lib.useAudioDevices());
        }, DEVICES);
        await expect
          .poll(() =>
            page.evaluate(() =>
              window.lab.use(
                "devices",
                (state: UseAudioDevicesResult) => state.devices.length
              )
            )
          )
          .toBe(2);

        const state = await page.evaluate(() =>
          window.lab.use("devices", (devices: UseAudioDevicesResult) => ({
            first: devices.devices[0],
            permission: devices.permission,
          }))
        );

        expect(state.first).toMatchObject({ id: "default", isDefault: true });
        expect(state.permission).toBe("granted");
      });

      test("useMicrophone opens the device with processing off and stops it", async ({
        page,
      }) => {
        await openLab(page);
        await page.evaluate((devices) => {
          const { lab } = window;
          lab.mockMedia([...devices]);
          lab.mount("mic", () =>
            lab.lib.useMicrophone({ deviceId: "usb", enabled: true })
          );
        }, DEVICES);
        await expect
          .poll(() =>
            page.evaluate(() =>
              window.lab.use("mic", (mic: UseMicrophoneResult) => mic.status)
            )
          )
          .toBe("active");

        const request = await page.evaluate(() => window.lab.media.requests[0]);

        expect(request).toEqual({
          audio: {
            autoGainControl: false,
            deviceId: { exact: "usb" },
            echoCancellation: false,
            noiseSuppression: false,
          },
        });
        await page.evaluate(() => window.lab.unmount("mic"));
        expect(
          await page.evaluate(() => window.lab.media.streams[0]?.stopped())
        ).toBeGreaterThan(0);
      });

      test("useMicrophone does not hand out the stopped stream when started again", async ({
        page,
      }) => {
        await openLab(page);
        await page.evaluate((devices) => {
          const { lab } = window;
          lab.mockMedia([...devices]);
          lab.mount("mic", () => lab.lib.useMicrophone({ enabled: true }));
        }, DEVICES);
        await expect
          .poll(() =>
            page.evaluate(() =>
              window.lab.use("mic", (mic: UseMicrophoneResult) => mic.status)
            )
          )
          .toBe("active");
        await page.evaluate(() =>
          window.lab.use("mic", (mic: UseMicrophoneResult) => mic.stop())
        );
        await expect
          .poll(() =>
            page.evaluate(() => window.lab.media.streams[0]?.stopped())
          )
          .toBeGreaterThan(0);

        const restarted = await page.evaluate(async () => {
          const { lab } = window;
          lab.media.hold = true;

          return lab.use("mic", async (mic: UseMicrophoneResult) => {
            await mic.start();
            await lab.settle();

            return { status: mic.status, stream: mic.stream };
          });
        });

        expect(restarted).toEqual({ status: "acquiring", stream: null });
      });

      test("useSystemAudio drops a capture that arrives after stop()", async ({
        page,
      }) => {
        await openLab(page);

        const result = await page.evaluate(async (devices) => {
          const { lab } = window;
          lab.mockMedia([...devices]);
          lab.mount("system", () => lab.lib.useSystemAudio());
          await lab.settle();

          return lab.use("system", async (system: UseSystemAudioResult) => {
            const started = system.start();
            await lab.settle();

            const whilePicking = system.status;
            system.stop();
            lab.media.pick();
            await started;
            await lab.settle();

            return {
              status: system.status,
              stopped: lab.media.streams[0]?.stopped(),
              stream: system.stream,
              whilePicking,
            };
          });
        }, DEVICES);

        expect(result.whilePicking).toBe("prompting");
        expect(result.status).toBe("idle");
        expect(result.stream).toBeNull();
        expect(result.stopped).toBeGreaterThan(0);
      });

      test("useSystemAudio stops its capture when its owner goes away", async ({
        page,
      }) => {
        await openLab(page);

        const result = await page.evaluate(async (devices) => {
          const { lab } = window;
          lab.mockMedia([...devices]);
          lab.mount("system", () => lab.lib.useSystemAudio());
          await lab.settle();

          const active = await lab.use(
            "system",
            async (system: UseSystemAudioResult) => {
              const started = system.start();
              lab.media.pick();
              await started;
              await lab.settle();

              return system.status;
            }
          );

          lab.unmount("system");

          return { active, stopped: lab.media.streams[0]?.stopped() };
        }, DEVICES);

        expect(result.active).toBe("active");
        expect(result.stopped).toBeGreaterThan(0);
      });
    });

    test.describe("audio player options", () => {
      const startPlayer = (page: Page, body: "volume" | "reload" | "clear") =>
        page.evaluate(async (scenario) => {
          const { lab } = window;
          lab.countMediaCalls();
          const url = lab.silentWavUrl();

          lab.mount("player", () => {
            const [muted, setMuted] = lab.signal(false);
            const [autoPlay, setAutoPlay] = lab.signal(false);

            const [preload, setPreload] = lab.signal<"auto" | "metadata">(
              "metadata"
            );

            const [src, setSrc] = lab.signal<string | undefined>(url);

            const player = lab.lib.useAudioPlayer(() => ({
              autoPlay: autoPlay(),
              muted: muted(),
              preload: preload(),
              src: src(),
            }));

            return {
              change: () => {
                if (scenario === "volume") {
                  player.setVolume(0.3);
                  setMuted(true);
                } else if (scenario === "reload") {
                  setAutoPlay(true);
                  setPreload("auto");
                } else setSrc(undefined);
              },
              player,
            };
          });
          await lab.settle();

          return lab.mediaCalls.loads;
        }, body);

      test("keeps a volume set imperatively when another option changes", async ({
        page,
      }) => {
        await openLab(page);
        await startPlayer(page, "volume");

        const result = await page.evaluate(async () => {
          const { lab } = window;
          lab.use("player", (state: { change: () => void }) => state.change());
          await lab.settle();

          return lab.use(
            "player",
            (state: { player: AudioPlayerController }) => ({
              muted: state.player.element?.muted,
              volume: state.player.element?.volume,
            })
          );
        });

        expect(result.muted).toBe(true);
        expect(result.volume).toBeCloseTo(0.3);
      });

      test("does not reload the track when autoPlay or preload changes", async ({
        page,
      }) => {
        await openLab(page);

        const loadsAtStart = await startPlayer(page, "reload");

        const loadsAfter = await page.evaluate(async () => {
          window.lab.use("player", (state: { change: () => void }) =>
            state.change()
          );
          await window.lab.settle();

          return window.lab.mediaCalls.loads;
        });

        expect(loadsAfter).toBe(loadsAtStart);
      });

      test("stops the old track when the source is cleared", async ({
        page,
      }) => {
        await openLab(page);

        const loadsAtStart = await startPlayer(page, "clear");

        const result = await page.evaluate(async () => {
          const { lab } = window;
          lab.use("player", (state: { change: () => void }) => state.change());
          await lab.settle();

          const cleared = lab.use(
            "player",
            (state: { player: AudioPlayerController }) =>
              state.player.element?.hasAttribute("src")
          );

          return { cleared, loads: lab.mediaCalls.loads };
        });

        expect(result.cleared).toBe(false);
        expect(result.loads).toBe(loadsAtStart + 1);
      });
    });
  });
};
