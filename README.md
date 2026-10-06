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

- `components/ui/` — public component implementations;
- `components/blocks/` — composed audio interfaces;
- `components/examples/` — upstream-parity examples used by the gallery;
- `components/docs/` — docs-preview presentation only;
- `hooks/` — Solid/Web Audio lifecycle integrations;
- `lib/audio/` — framework-neutral audio math, timing, frame, and meter logic;
- `lib/solid/` — Solid-specific prop, ref, lifecycle, and Solid 1/2 compatibility helpers;
- `app/` — local preview and acceptance harness, not library code;
- `e2e/` — shared browser acceptance for both Solid runtimes;
- `test/` — non-browser contracts such as public type-surface checks;
- `tools/` — repository tooling that is not shipped with the library.
- `site/` — static Solid 2 documentation, search, and examples, excluded from consumer installs.

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

`bun run registry:spike:3` generates both registries, installs and builds every entry in fresh consumer projects, and exercises installed controls and blocks in both runtimes. Reports and screenshots are written to `artifacts/`.

Run `cd site && bun run typecheck && bun run build:release && bunx playwright test --grep-invert "compare upstream and local page structure"` for production-site acceptance. The release guard rejects missing pages, examples, and caught SSR failures. `bun run parity` separately compares every public route (the 57 pages in upstream's sitemap) with the live upstream site at desktop and mobile sizes, plus the shared not-found state; a successful release build alone does not establish upstream parity.

Every page has a committed 1200x630 social card in `site/public/og`, indexed by `site/lib/social-images.json`. `cd site && bun run og:build` regenerates them: it builds the site in `--mode social`, which adds the capture-only `/social-preview/:id` route, and captures each card in Chromium with a paused clock. `bun run og:build -- --verify` captures every card twice and fails on any byte difference. Edit `site/lib/social-catalog.ts` for card copy and `site/components/social/` for compositions. The build also refreshes the GitHub star count in `site/lib/github-stars.json` and keeps the committed count if GitHub is unreachable.

The generated registries live at `site/public/r/solid1` and `site/public/r/solid2`. Consumers install component sources and their declared dependencies, not the site or its examples.

Parity checks keep exact presentation slots, example inventories, accessible control names, and layout measurements. Native ranges and ARIA sliders are compared as one interactive control, excluding hidden form duplicates. Solid-specific prose uses exact, route-scoped source adapters in `site/e2e/parity/content-adapters.json`; stale upstream text fails instead of silently expanding an exemption. Captures wait for synthesized audio and lazy tiles to finish loading.

Beyond each route's main content, parity also compares:

- **Head:** title, description, robots, canonical, every `og:*` and `twitter:*` tag, and the `icon` and `apple-touch-icon` links, as a sorted set of exact values. `site/e2e/parity/head.ts` rewrites only the site origin and name, `for React` wording, per-build image hashes and icon fingerprints. Any other wording difference needs an exact, route-scoped entry in `head-adapters.json`, which throws once upstream stops sending that text. Each page's declared `og:image` must load from our server as a 1200x630 PNG.
- **Chrome:** the accessibility-tree inventory (role, accessible name, state, normalized href, order) of the header, docs sidebar and its controls, and footer, plus the brand context menu, and, at mobile width, the opened home menu and docs drawer. On desktop docs routes it also collapses the sidebar and records the collapsed, edge-peek and re-expanded states: the sidebar's `data-collapsed`/`data-hovered`/`inert` state and offset, the floating panel, every `aria-controls="nd-sidebar"` trigger's label, `aria-expanded` and inertness, and where focus lands. Star counts and the mobile contents progress value are live data and compare by wording only.
- **Route inventory:** the routes in `dist/client/sitemap.xml` must equal upstream's `sitemap.xml` and the compared route list, so a missing or extra public page fails.
- **Not found:** an unknown URL's status, title, heading, robots tag and action links. `not-found-adapters.json` records the two intended differences: `vite preview` answers 200 where Next answers 404 (the shipped `404.html` is asserted in `page-states.spec.ts`), and our not-found page has its own title.

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

The site brand-assets menu retains the upstream third-party notices in `THIRD_PARTY_NOTICES.md`, including the Outfit wordmark's SIL Open Font License.
