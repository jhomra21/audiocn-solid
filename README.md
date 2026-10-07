# audiocn-solid

A Solid port of [audiocn/ui](https://github.com/audiocn/ui). The goal is the same component behavior and styling without a React runtime.

The current port includes:

- the framework-neutral audio core used by meters and visualizers;
- all upstream meters, visualizers, waveform, mixer controls, audio player, track list, sound pads, and device selection;
- audio capture, gain, levels, frame subscriptions, playback, sound, waveform data, and Web Audio mixer hooks;
- Music Player, Soundboard, Mic Setup, System Audio Settings, Quick Audio Popover, and System Audio Mixer blocks;
- supporting native Solid primitives and runtime-matched Kobalte overlays and sliders;
- 65 registry entries for each runtime, 55 documentation pages, and a static Solid 2 site;
- the upstream palette, dark mode, color themes, DM Sans, Outfit, and Geist Mono.

The same component source runs under Solid 1 and Solid 2. CI typechecks both versions and runs the same browser acceptance suite against both runtimes.

## Repository layout

The port mirrors upstream audiocn where that structure maps cleanly to Solid:

- `components/ui/`: public component implementations;
- `components/blocks/`: composed audio interfaces;
- `components/examples/`: upstream-parity examples used by the gallery;
- `components/docs/`: docs-preview presentation only;
- `hooks/`: Solid/Web Audio lifecycle integrations;
- `lib/audio/`: framework-neutral audio math, timing, frame, and meter logic;
- `lib/solid/`: Solid-specific prop, ref, lifecycle, and Solid 1/2 compatibility helpers;
- `app/`: local preview and acceptance harness, not library code;
- `e2e/`: shared browser acceptance for both Solid runtimes;
- `test/`: non-browser contracts such as public type-surface checks;
- `tools/`: repository tooling that is not shipped with the library.
- `site/`: static Solid 2 documentation, search, and examples, excluded from consumer installs.

The repository stays a single package until a subsystem has an independent runtime or distribution boundary. This keeps the source close to audiocn without introducing monorepo structure before it is useful.

## Development

Install and start the Solid 1 preview:

```sh
bun install
bun run dev
```

The root preview is an acceptance harness. Run `cd site && bun run dev` for the documentation site.

Run the normal checks and browser acceptance:

```sh
bun run check
bunx playwright install chromium
bun run test:e2e
```

The browser suite checks the example gallery, live meter geometry and updates, fonts and theme tokens, latching clips, console warnings, component prop contracts, reduced-motion startup, and source/value switching. It writes a repeatable screenshot to `test-results/artifacts/example-gallery.png`.

## Solid 2 acceptance

CI temporarily replaces the Solid 1 packages with the current Solid 2 prerelease and uses Solid 2's compiler and web runtime:

```sh
bun add --no-save solid-js@2.0.0-rc.13 @solidjs/web@2.0.0-rc.13 @solidjs/vite-plugin@3.0.0-next.47 vite@8.3.2
bunx tsc -p tsconfig.solid2.json --noEmit
bunx playwright install chromium
bun run test:e2e:solid2
```

The Solid 2 screenshot is written to `test-results/solid2-artifacts/example-gallery.png`.

Run `bun install` afterward to restore the repository's Solid 1 development dependencies.

## Registry and site validation

`bun run registry:validate-shadcn` runs the pinned shadcn CLI validator against the source registry. `bun run registry:spike:3` generates both registries, installs each of the 65 entries in its own fresh consumer project per runtime, typechecks every installed source file, builds each item, and exercises installed controls and blocks. Consumer setup executes the documented Solid bootstrap; item projects share Bun's download cache, never sources or `node_modules`. The report records all 130 file/dependency/license plans and excludes React packages. Reports and screenshots are written to `artifacts/`.

Run `cd site && bun run typecheck && bun run build:release && bunx playwright test --grep-invert "compare upstream and local page structure"` for production-site acceptance. The release guard rejects missing pages, examples, and caught SSR failures. `bun run parity` separately compares every public route (the 57 pages in upstream's sitemap) with the live upstream site at desktop and mobile sizes, plus the shared not-found state; a successful release build alone does not establish upstream parity.

Every page has a committed 1200x630 social card in `site/public/og`, indexed by `site/lib/social-images.json`. `cd site && bun run og:build` regenerates them: it builds the site in `--mode social`, which adds the capture-only `/social-preview/:id` route, and captures each card in Chromium with a paused clock. `bun run og:build -- --verify` captures every card twice and fails on any byte difference. Edit `site/lib/social-catalog.ts` for card copy and `site/components/social/` for compositions. The build also refreshes the GitHub star count in `site/lib/github-stars.json` and keeps the committed count if GitHub is unreachable.

The generated registries live at `site/public/r/solid1` and `site/public/r/solid2`. Consumers install component sources and their declared dependencies, not the site or its examples.

## Cloudflare staging

The site deploys as static Worker assets. `wrangler.jsonc` serves `site/dist/client` and uses the generated `404.html` for unknown routes.

Build with the exact staging origin so canonical links, AI prompts, social metadata, and registry URLs point at the deployed host:

```sh
VITE_AUDIOCN_SITE_URL=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run --cwd site build:release
bunx --bun wrangler@4.148.0 deploy
```

After deployment, verify the public site and both registries:

```sh
AUDIOCN_SITE_URL=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run --cwd site host:check

AUDIOCN_REGISTRY_ORIGIN=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run registry:test-install
```

The hosted registry check creates fresh Solid 1 and Solid 2 consumer projects. It installs every registry item through the public HTTPS endpoint, then typechecks and builds each install. Do not submit the registry directory entry until both commands pass against the deployed Worker.

For Workers Builds, import this repository from the Cloudflare dashboard and keep the repository root as the build root. For staging, point the production branch at `feat/solid2-site-spikes`. Set `BUN_VERSION=1.4.2` and `SKIP_DEPENDENCY_INSTALL=1`, then use:

- Build command: `bun install --frozen-lockfile && bun run --cwd site build:release`
- Deploy command: `bunx --bun wrangler@4.148.0 deploy`
- Build variable: `VITE_AUDIOCN_SITE_URL=https://audiocn-solid.<workers-subdomain>.workers.dev`

The Cloudflare Worker must be named `audiocn-solid` to match `wrangler.jsonc`. If this is the account's first Worker and the `workers.dev` subdomain is not known yet, create the Worker once, copy its assigned URL, set `VITE_AUDIOCN_SITE_URL`, and redeploy the same commit before running the hosted checks.

## shadcn Registry Directory submission

Submit the stable Solid 1 registry to shadcn's public Registry Directory only after the deployed Worker passes both hosted checks above. The directory accepts one URL template per namespace, so `@audiocn-solid` points to Solid 1. Solid 2 users keep the explicit `/r/solid2/` registry URL in `components.json`.

Fork `shadcn-ui/ui`, add this entry to `apps/v4/registry/directory.json`, replacing the example hostname with the verified Worker URL:

```json
{
  "name": "@audiocn-solid",
  "homepage": "https://audiocn-solid.<workers-subdomain>.workers.dev",
  "url": "https://audiocn-solid.<workers-subdomain>.workers.dev/r/solid1/{name}.json",
  "description": "Audio components for Solid, distributed as source through shadcn.",
  "logo": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' fill='none' stroke='var(--foreground)' stroke-linecap='round'><path d='M38.4 102.9a43.5 43.5 0 1 1 51.2 0' stroke-width='8.6'/><path d='m63.3 70 20.5-23.8' stroke-width='8'/></svg>"
}
```

From the shadcn repository, run its registry validation command:

```sh
pnpm validate:registries
```

Then open a pull request containing only the directory entry. After shadcn merges it, verify that the public directory resolves the namespace before testing a fresh consumer with `shadcn add @audiocn-solid/<item>`.

## Source-registry release

Follow upstream AudioCN's distribution model: keep the development/site packages private and ship a hosted shadcn source registry, not an npm component bundle. `cd site && bun run build:release` generates both runtime registries before Vite, including their compatibility files and consumer license notice; no prior registry cache is required. `bun run registry:test-release` proves this command from an owned clean checkout of the current source and checks the built payloads. `bun run registry:test-contracts` checks the release and isolated-install contracts.

Consumers follow `site/content/docs/installation.mdx`: create a Solid Vite app, configure Tailwind and `components.json` manually, then use `shadcn@4.21.0 add @audiocn-solid/<name>` with the runtime-matched registry URL. The React-oriented shadcn initializer is not this port's bootstrap. Solid 1 is stable; Solid 2/Kobalte 2 remain the explicitly tested experimental lane.

Before announcing a release, set `VITE_AUDIOCN_SITE_URL` to the real HTTPS origin, validate the final commit in remote CI, and tag that reviewed source revision. Build and deploy only `site/dist/client`; verify the actual host honors the generated Markdown `_headers`, returns `404.html` with status 404 for unknown URLs, and serves both registry JSON inventories. Test the documented bootstrap against that HTTPS origin in fresh consumer apps. The unversioned registry URLs represent the currently deployed source revision; consumers own copied code and must review later updates. No hosting/deployment or public release is implied by local acceptance.

Parity checks keep exact presentation slots, example inventories, accessible control names, and layout measurements. Native ranges and ARIA sliders are compared as one interactive control, excluding hidden form duplicates. Solid-specific prose uses exact, route-scoped source adapters in `site/e2e/parity/content-adapters.json`; stale upstream text fails instead of silently expanding an exemption. Captures wait for synthesized audio and lazy tiles to finish loading.

Beyond each route's main content, parity also compares:

- **Head:** title, description, robots, canonical, every `og:*` and `twitter:*` tag, and the `icon` and `apple-touch-icon` links, as a sorted set of exact values. `site/e2e/parity/head.ts` rewrites only the site origin and name, `for React` wording, per-build image hashes and icon fingerprints. Any other wording difference needs an exact, route-scoped entry in `head-adapters.json`, which throws once upstream stops sending that text. Each page's declared `og:image` must load from our server as a 1200x630 PNG.
- **Chrome:** the accessibility-tree inventory (role, accessible name, state, normalized href, order) of the header, docs sidebar and its controls, and footer, plus the brand context menu, and, at mobile width, the opened home menu and docs drawer. On desktop docs routes it also collapses the sidebar and records the collapsed, edge-peek and re-expanded states: the sidebar's `data-collapsed`/`data-hovered`/`inert` state and offset, the floating panel, every `aria-controls="nd-sidebar"` trigger's label, `aria-expanded` and inertness, and where focus lands. Star counts and the mobile contents progress value are live data and compare by wording only.
- **Route inventory:** the routes in `dist/client/sitemap.xml` must equal upstream's `sitemap.xml` and the compared route list, so a missing or extra public page fails.
- **Not found:** an unknown URL's status, title, heading, robots tag and action links. `not-found-adapters.json` records only the preview status difference: `vite preview` answers 200 where Next answers 404. The shipped `404.html` inherits the root title and is asserted in `page-states.spec.ts` and the strict static-host acceptance.

`site/e2e/parity/contracts.spec.ts` corrupts each dimension (head tags, icons, og images, nav and sidebar links, the stars control, mobile menus, the collapsed sidebar, sitemap routes, the not-found heading) and fails unless the harness notices.

## Prerelease compatibility

Solid 2 and Kobalte 2 are prereleases. Select, Popover, and Context Menu use Kobalte's public APIs; Context Menu defers collection unregister writes during disposal. Tabs are native Solid because Kobalte's current Solid 2 tabs lose event bindings during production hydration. Native tabs support controlled selection, keyboard navigation, disabled items, and linked panels.

`lib/solid/kobalte-slider.ts` adapts Kobalte's slider context to the shared native slider implementation. This is a version-sensitive seam, validated by the pinned two-runtime browser and fresh-install tests, not a guarantee for arbitrary future Kobalte prereleases.

## Porting policy

The upstream implementation is the behavior reference. Framework-neutral audio code stays framework-neutral. React lifecycle and state are translated at the framework boundary.

Solid 1 and Solid 2 have different effect and context-provider contracts. The small helpers in `lib/solid/effect.ts` and `lib/solid/context.ts` contain those differences so the component implementations stay shared.

See `AGENTS.md` for the engineering rules and reference codebases.

## License

MIT. Portions are adapted from audiocn/ui; see `license.md`. The Warcraft clip used by the docs is a site-only, non-MIT asset and is not included in consumer registry items.

Every independently installable registry item includes `lib/audiocn-license.txt`, retaining the upstream MIT and applicable Phosphor notices without copying site assets. Keep it with redistributed source.

The site brand-assets menu retains the upstream third-party notices in `THIRD_PARTY_NOTICES.md`, including the Outfit wordmark's SIL Open Font License.
