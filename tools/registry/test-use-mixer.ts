import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import { createSignal } from "solid-js";

import {
  useMixer,
} from "@/hooks/use-mixer";
import type {
  MixerState,
} from "@/hooks/use-mixer";

const initialControlled: MixerState = {
  channels: [
    {
      gainDb: 0,
      id: "controlled",
      monitor: false,
      muted: false,
      pan: 0,
      solo: false,
    },
  ],
  master: {
    gainDb: 0,
    muted: false,
  },
};

export default function App() {
  const mixer = useMixer({
    channels: [
      { id: "a" },
      { id: "b" },
    ],
    master: {
      gainDb: -3,
    },
  });

  const persisted = useMixer({
    channels: [
      { id: "persist" },
    ],
    persistKey: "audiocn-solid-use-mixer-e2e",
  });

  const [controlledState, setControlledState] =
    createSignal(initialControlled);

  const controlled = useMixer({
    get state() {
      return controlledState();
    },
    onStateChange: setControlledState,
  });

  const a = () => mixer.channel("a");
  const b = () => mixer.channel("b");
  const persistedChannel = () =>
    persisted.channel("persist");
  const controlledChannel = () =>
    controlled.channel("controlled");

  return (
    <main style="display: grid; gap: 12px; padding: 48px">
      <button onClick={() => mixer.setGain("a", -12)}>gain</button>
      <button onClick={() => mixer.setPan("a", 2)}>pan</button>
      <button onClick={() => mixer.setMuted("a", true)}>mute-a</button>
      <button onClick={() => mixer.setSolo("b", true)}>solo-b</button>
      <button onClick={() => mixer.setSolo("a", true, { exclusive: true })}>solo-a-exclusive</button>
      <button onClick={() => mixer.setMonitor("a", true)}>monitor</button>
      <button onClick={() => mixer.setMasterGain(-8)}>master-gain</button>
      <button onClick={() => mixer.setMasterMuted(true)}>master-mute</button>
      <button onClick={() => mixer.addChannel({ id: "c", gainDb: -6 })}>add-c</button>
      <button onClick={() => mixer.removeChannel("c")}>remove-c</button>
      <button onClick={() => mixer.reset()}>reset</button>
      <button onClick={() => persisted.setGain("persist", -9)}>persist-gain</button>
      <button onClick={() => controlled.setPan("controlled", -0.75)}>controlled-pan</button>

      <output data-testid="a">
        {a()?.gainDb}|{a()?.pan}|{String(a()?.muted)}|{String(a()?.solo)}|{String(a()?.monitor)}
      </output>
      <output data-testid="b">
        {String(b()?.solo)}
      </output>
      <output data-testid="audible">
        {String(mixer.isAudible("a"))}|{String(mixer.isAudible("b"))}|{String(mixer.isDimmed("a"))}|{String(mixer.isDimmed("b"))}
      </output>
      <output data-testid="master">
        {mixer.master.gainDb}|{String(mixer.master.muted)}
      </output>
      <output data-testid="count">
        {mixer.channels.length}
      </output>
      <output data-testid="persisted-gain">
        {persistedChannel()?.gainDb}
      </output>
      <output data-testid="controlled-pan">
        {controlledChannel()?.pan}
      </output>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page) => {
    const a = page.getByTestId("a");
    const b = page.getByTestId("b");
    const audible = page.getByTestId("audible");
    const master = page.getByTestId("master");
    const count = page.getByTestId("count");
    const persistedGain = page.getByTestId("persisted-gain");

    const click = (name: string) =>
      page.getByRole("button", { exact: true, name }).click();

    await expect(a).toHaveText("0|0|false|false|false");
    await expect(master).toHaveText("-3|false");

    await click("gain");
    await expect(a).toHaveText("-12|0|false|false|false");

    await click("pan");
    await expect(a).toHaveText("-12|1|false|false|false");

    await click("solo-b");
    await expect(b).toHaveText("true");
    await expect(audible).toHaveText("false|true|true|false");

    await click("solo-a-exclusive");
    await expect(a).toHaveText("-12|1|false|true|false");
    await expect(b).toHaveText("false");

    await click("mute-a");
    await expect(audible).toHaveText("false|false|false|true");

    await click("monitor");
    await expect(a).toHaveText("-12|1|true|true|true");

    await click("master-gain");
    await click("master-mute");
    await expect(master).toHaveText("-8|true");

    await click("add-c");
    await expect(count).toHaveText("3");

    await click("remove-c");
    await expect(count).toHaveText("2");

    await click("controlled-pan");
    await expect(page.getByTestId("controlled-pan")).toHaveText("-0.75");

    await click("persist-gain");
    await expect(persistedGain).toHaveText("-9");

    await page.reload();
    await expect(persistedGain).toHaveText("-9");

    await click("reset");
    await expect(a).toHaveText("0|0|false|false|false");
    await expect(master).toHaveText("-3|false");

    return { persistedGain: await persistedGain.textContent() };
  },
  name: "use-mixer",
  port: 5091,
  viewport: { height: 900, width: 1000 },
});
