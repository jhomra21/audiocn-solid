# Handoff: Solid port and site microfidelity

## Checkpoint

- Repository: `https://github.com/jhomra21/audiocn-solid.git`
- Branch: `feat/solid2-site-spikes`; use `git rev-parse HEAD` for this checkpoint.
- Previous checkpoints: `3425db7` (native gestures and independent registry releases), `cf42bd5` (site parity and both runtimes).
- This checkpoint adds homepage/header micro-interactions and sidebar stability. No merge, deployment, npm publication, or remote-CI success is claimed.

## What is implemented

- Shared Solid 1/2 audio component and hook sources, framework-neutral audio core, waveform/player/sound-pad/device controls, mixer interfaces, and six composed blocks.
- Each runtime has 65 source-registry entries: 38 UI, 18 hooks, six blocks, three library entries. Consumers receive copied source, dependencies, compatibility files, and license notices, not site examples or assets.
- Static Solid 2 documentation: 55 docs pages, 57 public routes, 14 interactive home tiles, search, contributors, themes, source/code previews, Markdown/LLM resources, AI/clipboard actions, SEO and social cards.
- Latest changes: spring icon swaps, clipboard success/error audio and haptics, stale-result/disposal handling, portal-mounted brand toasts, theme view transitions with fallback, tooltip entry/exit with idle unmount, mobile-menu dismissal/focus/resize, compact search controls and SVG arrows.
- Docs navigation restores sidebar scroll before minimally revealing an offscreen active link; visible neighboring links, history navigation, and search navigation are covered.
- Removed the closed tooltip's persistent popper to prevent mobile overflow after desktop navigation; copy SVG sizing preserves heading geometry.
- `site/vite.config.ts` disables Solid refresh and conditional wrapping for reproducible Solid 2 SSR/hydration keys. Component edits use full reload; CSS HMR remains available. Do not remove these settings without native-dev hydration coverage.
- Motion imports use `framer-motion/dom`; Tiks uses its framework-neutral entry. Both are MIT, site-only dependencies; React is not installed for these optional peers.

## Ownership and pinned lanes

Read `AGENTS.md` and `README.md` first. Keep public behavior in `components/ui`, composed interfaces in `components/blocks`, examples in `components/examples`, lifecycle integrations in `hooks`, pure audio in `lib/audio`, and runtime seams in `lib/solid`. No barrel files or organizational `packages/` monorepo.

The frozen lock uses root Solid `1.9.15`, site Solid/web `2.0.0-rc.13`, Solid Vite plugin `3.0.0-next.47`, Kobalte `0.13.14`/`2.0.0-alpha.2`, and site Vite `8.3.2`. Solid 2/Kobalte 2 are experimental. Shared effect/context, Kobalte slider and collection-disposal seams are intentional.

## Resume on another computer

Use Bun `1.4.2`. This machine used Node `26.5.0`; Vite requires Node `20.19+` or `22.12+`, not that exact local version.

```sh
git clone --branch feat/solid2-site-spikes https://github.com/jhomra21/audiocn-solid.git
cd audiocn-solid
bun install --frozen-lockfile
bunx playwright install chromium webkit
bun run format:check
bun run lint
bun run check
bun run test:unit
bun run test:e2e
cd site
bun run typecheck
bun run test:unit
bun run build:release
bunx playwright test --grep-invert "compare upstream and local page structure"
```

The production-site suite owns port `4180`; stop your own preview first. For manual inspection, from `site/` run `bun run dev -- --host 127.0.0.1`, or after building run `bun run preview -- --host 127.0.0.1 --port 4180 --strictPort` in a separate terminal. No server process or absolute path from the previous machine is needed.

Focused site regression: `bunx playwright test e2e/home-micro-fidelity.spec.ts e2e/chrome-microfeedback.spec.ts e2e/docs-sidebar-navigation.spec.ts e2e/contributors.spec.ts --config playwright.isolated.config.ts --workers=2`. The isolated runner owns port `4400` and builds under `/tmp`.

From the root, `bun run registry:test-contracts` runs four unit contracts and seven isolated consumer browser checks. `bun run registry:test-release` certifies a clean frozen installation/release build. `bun run registry:spike:3` is the longer independent-install certification for all 65 items per runtime.

For the root Solid 2 lane, use the exact temporary dependency-overlay commands in README's **Solid 2 acceptance** section, then restore with `bun install --frozen-lockfile`. Do not swap the shared source or commit overlay dependency changes.

## Accepted local evidence

All 18 implementation/dependency/test hashes matched the final integration snapshot before this handoff was added; no behavior cleanup was needed. Final root/site typechecks, repository lint, formatting, and whitespace checks were rerun.

- Chromium site: 174 passed, six explicitly gated skips, zero failures/flakiness.
- WebKit targeted site: 22 passed, zero skips/failures/flakiness.
- Native Vite dev: five passed, including all four dev-only SSR/Markdown/action cases skipped by production acceptance.
- Sidebar repeat: six passes across three repetitions.
- Existing unit checks: 100 root, 101 site; registry contracts: four unit and seven consumer browser passes.
- Release: clean frozen install, 65 entries and 174 file references per runtime, 60 prerendered pages; 55 Markdown pages and 64 sampled HTTP resources passed.
- Parity: all 57 public routes, zero unallowlisted differences; no parity exemptions/adapters changed by this checkpoint.

The reference inventory/feedback source was audiocn/ui `1c35867a34206820e34849eeb841dc52b2ced24f`. Browser presentation comparisons used live `https://www.audiocn.dev`, not a locally served frozen React build. To rerun parity, provide a checkout/export containing that revision's `content/docs` via `AUDIOCN_UPSTREAM_SOURCE=/path/to/upstream bun run parity` (root or site). Live upstream drift must be investigated, not hidden behind new blanket exemptions.

Raw reports/screenshots under `artifacts/`, `site/artifacts/`, build output, and local security files are git-ignored/excluded and do not travel with this push. Regenerate them with the commands above; do not treat missing local artifacts as remote evidence. Local bounded STRIDE/credential review found no confirmed findings; it is not a dependency-advisory audit or whole-history security certification.

## Remaining work and limits

1. Check remote CI for the final pushed revision before merging/tagging. The long registry/site jobs still need remote confirmation.
2. Choose the actual HTTPS deployment hostname. `https://audiocn-solid.workers.dev` is a placeholder in `site/lib/site.ts` and installation docs; no actual workers.dev hostname was supplied.
3. Keep both packages private. Release via hosted `/r/solid1` and `/r/solid2` source registries, not npm. Build/deploy only `site/dist/client`; then verify HTTPS bootstrap, Markdown MIME headers, unknown-route HTTP 404, and both inventories on the real host.
4. Test physical audio, microphone/system capture, haptics and iOS hardware. Synthetic Web Audio and desktop WebKit are not hardware certification.
5. Three upstream React Activity lifecycle cases remain inapplicable: retained-player pause/no-reload, capture returning idle on hide/show, and graph disconnect/reconnect with retained ownership. Solid owner disposal/CSS hiding are not equivalent.
6. Two spike-only fixtures remain mode-gated; dev-only cases were independently verified. No absolute pixel, waveform, spring-physics, or bug-free parity claim.
7. Existing native-config import-extension warnings and root bundle-size warning are unrelated; no new warning suppression was added.

Next agent: verify the fetched checkpoint and CI, then address only the next requested task. No additional redesign, refactor, merge, or deployment is authorized by this handoff.
