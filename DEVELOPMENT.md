# Development and release

Contributor instructions for local checks, releases and deployment.

## Repository layout

- `components/ui/`: public Solid components.
- `components/blocks/`: composed audio interfaces.
- `components/examples/`: examples used by the gallery.
- `components/docs/`: docs-preview presentation helpers only.
- `hooks/`: reusable Solid and Web Audio integrations.
- `lib/audio/`: framework-neutral audio math, timing, frames and meter logic.
- `lib/solid/`: Solid-specific compatibility helpers.
- `app/`: local preview and acceptance harness, not library code.
- `e2e/`: shared browser acceptance for both Solid runtimes.
- `test/`: non-browser contracts, including public type checks.
- `tools/`: development and registry tooling.
- `site/`: static Solid 2 documentation, search and examples.

The repository stays a single package until a subsystem has an independent runtime or distribution boundary.

## Local checks

Use Bun 1.4.2 and install the committed lockfile:

```sh
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run check
bun run test:unit
bun run --cwd site typecheck
bun run --cwd site test:unit
bun run --cwd site build:release
```

Browser acceptance:

```sh
bunx playwright install chromium webkit
bun run test:e2e:solid1
```

The Solid 2 browser suite replaces the root project's installed Solid/Vite packages. Run it in an owned checkout or worktree, not alongside another task or dev server using that checkout's `node_modules`. The override below uses the prereleases pinned in CI:

```sh
git worktree add ../audiocn-solid-solid2 HEAD
cd ../audiocn-solid-solid2
bun install --frozen-lockfile
bun add --no-save solid-js@2.0.0-rc.14 @solidjs/web@2.0.0-rc.14 @solidjs/vite-plugin@3.0.0-next.47 vite@8.3.2
bunx tsc -p tsconfig.solid2.json --noEmit
bunx playwright install chromium webkit
bun run test:e2e:solid2
```

The worktree starts at committed `HEAD`, so validate the intended candidate revision there. Preserve any needed artifacts before removing a worktree.

The browser suite writes repeatable screenshots under `test-results/`. The Solid 1 gallery screenshot is `test-results/artifacts/example-gallery.png`; Solid 2 writes `test-results/solid2-artifacts/example-gallery.png`.

## Registry and site checks

`bun run registry:validate-shadcn` runs the pinned shadcn registry validator. To build both registries and install every entry into isolated Solid 1 and Solid 2 consumer projects:

```sh
bun run registry:build
bun run registry:test-install
```

The install suite typechecks and builds all 130 item/runtime combinations, records their source, dependency and license plans in `artifacts/`, and excludes React packages. For installed-control and block browser acceptance, run `bun run registry:spike:3`.

For a release candidate, run the full source-level checks in CI, both browser suites, and the site release checks:

```sh
cd site
bun run typecheck
bun run test:unit
bun run build:release
bunx playwright test --config playwright.home-routing.config.ts
bunx playwright test --config playwright.release.config.ts
cd ..
bun run registry:test-release
```

Before `bun run registry:test-contracts`, build and install the registries with `bun run registry:build && bun run registry:test-install`. Keep the generated consumer fixtures while rerunning contracts; a stale report cannot recreate deleted consumers.

`bun run parity` compares public documentation routes, content, metadata and navigation against upstream. It requires an upstream source checkout/export:

```sh
AUDIOCN_UPSTREAM_SOURCE=/path/to/audiocn-ui bun run parity
```

The committed 1200x630 social cards live in `site/public/og`. Regenerate them with `bun run --cwd site og:build`; use `bun run --cwd site og:build -- --verify` to capture each card twice and check that the output is byte-identical. Edit `site/lib/social-catalog.ts` for card copy and `site/components/social/` for compositions. The build refreshes the GitHub star count in `site/lib/github-stars.json`, keeping the committed value if GitHub is unreachable. If card filenames change, update the image paths in `README.md`.

The generated registries live at `site/public/r/solid1` and `site/public/r/solid2`. Consumers install copied component source and declared dependencies, not the docs site or its examples. `cd site && bun run build:release` generates both registries before the site build, including runtime compatibility files and the consumer license notice. It does not require a prior registry cache.

## Cloudflare hosting

The site deploys as static Worker assets. `wrangler.jsonc` serves `site/dist/client` and uses the generated `404.html` for unknown routes. Build with the assigned HTTPS origin so canonical links, metadata and registry URLs use the deployed host:

```sh
VITE_AUDIOCN_SITE_URL=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run build:web
bunx wrangler deploy
```

Then check the actual deployment:

```sh
AUDIOCN_SITE_URL=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run --cwd site host:check

AUDIOCN_REGISTRY_ORIGIN=https://audiocn-solid.<workers-subdomain>.workers.dev \
  bun run registry:test-install
```

The hosted site check verifies sitemap routes and metadata, Markdown endpoints, search payload shape and document count, both registry inventories and item identities, the brand SVG, robots/LLM resources and 404 behavior. It verifies HTTP delivery, not browser hydration or every script and stylesheet. Hosted registry testing installs every item from the deployed endpoint into fresh Solid 1 and Solid 2 consumers. Do not submit a registry directory entry until both hosted checks pass.

For Workers Builds, use the repository root as the build root, keep automatic dependency installation enabled, set `BUN_VERSION=1.4.2`, and configure the same `VITE_AUDIOCN_SITE_URL` for the build. The Worker name must be `audiocn-solid` to match `wrangler.jsonc`.

## Registry directory and release

The shadcn Registry Directory accepts one URL template per namespace. The `@audiocn-solid` directory entry therefore targets stable Solid 1; Solid 2 users configure the explicit `/r/solid2/{name}.json` registry URL themselves.

Submit the directory entry only after deployment passes both hosted checks. In a fork of `shadcn-ui/ui`, add the following entry to `apps/v4/registry/directory.json`, replacing the example host with the verified Worker URL:

```json
{
  "name": "@audiocn-solid",
  "homepage": "https://audiocn-solid.<workers-subdomain>.workers.dev",
  "url": "https://audiocn-solid.<workers-subdomain>.workers.dev/r/solid1/{name}.json",
  "description": "Audio components for Solid, distributed as source through shadcn.",
  "logo": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128' fill='none' stroke='var(--foreground)' stroke-linecap='round'><path d='M38.4 102.9a43.5 43.5 0 1 1 51.2 0' stroke-width='8.6'/><path d='m63.3 70 20.5-23.8' stroke-width='8'/></svg>"
}
```

Run the shadcn repository's `pnpm validate:registries`, then open a pull request containing only the directory entry. After it merges, verify the public directory resolves the namespace and test a fresh consumer.

Follow audiocn's source-registry distribution model: keep development/site packages private and ship hosted shadcn source, not an npm component bundle. Before announcing a release, configure the real HTTPS site origin, validate the final commit in remote CI, and tag that reviewed source revision. Deploy only `site/dist/client`; check that the host returns the generated Markdown headers, `404.html` with status 404 for unknown routes, and both registry inventories. Test the documented bootstrap against the deployed origin in fresh consumer projects.

The unversioned registry URLs serve the source revision currently deployed. Consumers own their copied code and should review later updates. Staging is a candidate, not a release; publication and announcement require hosted checks and an explicit release decision.

## Port and compatibility notes

The upstream React implementation is the behavior reference. Framework-neutral audio code remains framework-neutral; React lifecycle and state are translated at the Solid boundary. Solid 1 and Solid 2 have different effect and context provider contracts; `lib/solid/effect.ts` and `lib/solid/context.ts` keep those differences out of shared component implementations.

Solid 2 and Kobalte 2 are prereleases. Select, Popover and Context Menu use Kobalte APIs; Context Menu defers collection unregister writes during disposal. Tabs are native Solid because Kobalte's current Solid 2 tabs lose event bindings during production hydration. The native tabs support controlled selection, keyboard navigation, disabled items and linked panels.

`lib/solid/kobalte-slider.ts` adapts Kobalte's slider context to the shared native slider implementation. Pinned two-runtime browser and fresh-install tests check this version-specific adapter. They do not guarantee compatibility with future Kobalte prereleases.

The Kobalte runtime dependencies are immutable prerelease archives from AudioCN-owned forks, not upstream releases or upstream-endorsed packages. See [`patches/README.md`](./patches/README.md) for source commits, release links and archive checksums.

### Mobile playback routing

Shared Web Audio hooks and standalone knob click sounds request `navigator.audioSession.type = "playback"` from a user gesture when the current type is `auto`. Suspended and Safari-interrupted contexts resume in that gesture. Audible copy feedback requests playback before awaiting the clipboard, including source-read failures. Plain `useAudioPlayer` media elements retain native playback behavior; media routed through an analyser or mixer also uses the shared context.

This is an intentional Safari compatibility improvement over upstream. The optional session API affects the whole page; explicitly selected categories such as `ambient` and `play-and-record` are preserved. Unsupported or rejecting browsers retain native behavior, and older iOS versions may still require Silent Mode off. Passive meters, visualizers, synthetic frame sources and offline demo rendering do not produce speaker audio. Microphone and screen capture still require browser support and permission.

Browser tests check gesture timing, category selection, native playback and interrupted-context recovery. Desktop WebKit and emulated category APIs do not prove iPhone ringer or speaker behavior. Verify playback on an iPhone with Silent Mode on and off and audible media volume.

## License and third-party assets

The project is MIT licensed. Portions are adapted from audiocn/ui; see [`license.md`](./license.md). The Warcraft clip used in the docs is a site-only, non-MIT asset and is not included in registry items.

Every independently installable registry item includes `lib/audiocn-license.txt`, retaining the upstream MIT and applicable Phosphor notices. Keep that file with redistributed source. The site brand-assets menu retains third-party notices in [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md), including the Outfit wordmark's SIL Open Font License.
