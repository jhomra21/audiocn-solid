import { cp, mkdir, readdir, symlink } from "node:fs/promises";
import { join } from "node:path";

import { defineConfig, mergeConfig } from "vite";
import type { ConfigEnv, Plugin } from "vite";

import base from "../vite.config.ts";

const PORT = 4398;

// Solid's preview manifest is relative to root; isolate the entire build,
// not just outDir. Dev SSR currently spins before serving its first request.
const root = "/tmp/audiocn-home-routing/site";

/**
 * One source edit per named fault, applied to the module graph in memory only.
 * A fault that no longer matches its source throws, so a refactor can never
 * leave a fault silently inactive.
 */
const FAULTS = {
  "faders-unrouted": {
    file: "site/components/home/tiles/faders-tile.tsx",
    from: "onValueChange={setGainDb}",
    to: "onValueChange={() => undefined}",
  },
  "ignore-mute": {
    file: "lib/docs/use-demo-mixer.ts",
    from: "playing: isChannelAudible(state, id),",
    to: "playing: true,",
  },
  "master-gain-fixed": {
    file: "lib/docs/use-demo-mixer.ts",
    from: "masterGain = state.master.muted ? 0 : dbToGain(state.master.gainDb);",
    to: "masterGain = 1;",
  },
  "meter-hold-unwritten": {
    file: "components/ui/level-meter.tsx",
    from: '"--meter-hold", state.hold',
    to: '"--meter-hold-unwritten", state.hold',
  },
  "meter-rms-unwritten": {
    file: "components/ui/level-meter.tsx",
    from: '"--meter-rms",',
    to: '"--meter-rms-unwritten",',
  },
  "mute-smoothed": {
    file: "site/components/home/tiles/mixer-tile.tsx",
    from: 'ballistics={audible() ? undefined : "instant"}',
    to: "ballistics={undefined}",
  },
  "tile-fader-unrouted": {
    file: "site/components/home/tiles/mixer-tile.tsx",
    from: "props.mixer.setGain(props.channel.id, gainDb)",
    to: "void gainDb",
  },
} satisfies Record<string, { file: string; from: string; to: string }>;

const homeRoutingHarness = (): Plugin => ({
  enforce: "pre",
  name: "home-routing-harness",
  transform(_code, id) {
    if (!id.split("?")[0]?.endsWith("/site/src/routes/index.tsx"))
      return undefined;

    return `
import { ShowcaseCard } from "@/site/components/home/showcase-card";
import { ShowcaseTile } from "@/site/components/home/showcase-tile";

export default function HomeRoutingHarness() {
  return (
    <main class="grid gap-8 p-8">
      <ShowcaseCard href="/docs/components/mixer" label="Mixer">
        <ShowcaseTile name="mixer" />
      </ShowcaseCard>
      <ShowcaseCard href="/docs/components/fader" label="Faders">
        <ShowcaseTile name="faders" />
      </ShowcaseCard>
    </main>
  );
}
`;
  },
});

const fault = (name: string | undefined): Plugin | undefined => {
  if (!name) return undefined;

  const entry = Object.entries(FAULTS).find(([key]) => key === name)?.[1];

  if (!entry) throw new Error(`Unknown home routing fault: ${name}`);

  return {
    enforce: "pre",
    name: `home-routing-fault:${name}`,
    transform(code, id) {
      if (!id.split("?")[0]?.endsWith(`/${entry.file}`)) return undefined;

      if (!code.includes(entry.from))
        throw new Error(`Fault ${name} no longer matches ${entry.file}`);

      return code.replace(entry.from, entry.to);
    },
  };
};

/**
 * An isolated build and preview for the home tile audio contract. The test
 * build replaces only the home route with the exact production Mixer/Faders
 * tiles, avoiding unrelated home animations while preserving SSR/hydration.
 * Setting `HOME_ROUTING_FAULT` breaks one behavior to prove the contract notices.
 */
export default defineConfig(async (env: ConfigEnv) => {
  await mkdir(root, { recursive: true });

  const site = join(import.meta.dirname, "..");

  for (const directory of [site, join(site, "..")]) {
    const destination = directory === site ? root : join(root, "..");

    for (const entry of await readdir(directory)) {
      if (
        entry === "site" ||
        entry === "src" ||
        entry.startsWith("dist") ||
        entry === "artifacts" ||
        entry === "test-results"
      )
        continue;

      try {
        await symlink(join(directory, entry), join(destination, entry));
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            "code" in error &&
            error.code === "EEXIST"
          )
        )
          throw error;
      }
    }
  }

  await cp(join(site, "src"), join(root, "src"), { recursive: true });

  const config = await base(env);

  return {
    ...mergeConfig(config, {
      root,
      cacheDir: join(root, ".vite"),
      preview: { host: "127.0.0.1", port: PORT, strictPort: true },
      server: { host: "127.0.0.1", port: PORT, strictPort: true },
    }),
    // Solid also enforces "pre"; source mutations must precede its compiler.
    plugins: [
      fault(process.env.HOME_ROUTING_FAULT),
      homeRoutingHarness(),
      config.plugins,
    ],
  };
});
