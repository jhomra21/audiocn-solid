# audiocn-solid

A Solid port of [audiocn/ui](https://github.com/audiocn/ui). The goal is the same component behavior and styling without a React runtime.

The current port includes:

- the framework-neutral audio core used by meters and visualizers;
- `DbReadout`, `DbScale`, `ClipIndicator`, and `LevelMeter`;
- the `LevelMeter` compound components;
- frame subscriptions, ballistics, visibility tracking, reduced motion, audio config, and clip hold state;
- `useDemoSignal`, `useAudioContext`, `useAudioAnalyser`, and `useMicrophone`;
- the button and microphone icon dependencies used by the upstream examples;
- all 16 upstream examples for the components above;
- the upstream palette, dark mode, color themes, DM Sans, Outfit, and Geist Mono.

The same component source runs under Solid 1 and Solid 2. CI typechecks both versions and runs the same browser acceptance suite against both runtimes.

## Repository layout

The port mirrors upstream audiocn where that structure maps cleanly to Solid:

- `components/ui/` — public component implementations;
- `components/examples/` — upstream-parity examples used by the gallery;
- `components/docs/` — docs-preview presentation only;
- `hooks/` — Solid/Web Audio lifecycle integrations;
- `lib/audio/` — framework-neutral audio math, timing, frame, and meter logic;
- `lib/solid/` — Solid-specific prop, ref, lifecycle, and Solid 1/2 compatibility helpers;
- `app/` — local preview and acceptance harness, not library code;
- `e2e/` — shared browser acceptance for both Solid runtimes;
- `test/` — non-browser contracts such as public type-surface checks;
- `tools/` — repository tooling that is not shipped with the library.

The repository stays a single package until a subsystem has an independent runtime or distribution boundary. This keeps the source close to audiocn without introducing monorepo structure before it is useful.

## Development

Install and start the Solid 1 preview:

```sh
bun install
bun run dev
```

The preview renders the 16 upstream examples in docs-style Preview and Code frames.

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
bun add --no-save solid-js@next @solidjs/web@next @solidjs/vite-plugin@next
bunx tsc -p tsconfig.solid2.json --noEmit
bunx playwright install chromium
bun run test:e2e:solid2
```

The Solid 2 screenshot is written to `test-results/solid2-artifacts/example-gallery.png`.

Run `bun install` afterward to restore the repository's Solid 1 development dependencies.

## Porting policy

The upstream implementation is the behavior reference. Framework-neutral audio code stays framework-neutral. React lifecycle and state are translated at the framework boundary.

Solid 1 and Solid 2 have different effect and context-provider contracts. The small helpers in `lib/solid/effect.ts` and `lib/solid/context.ts` contain those differences so the component implementations stay shared.

See `AGENTS.md` for the engineering rules and reference codebases.

## License

MIT. Portions are adapted from audiocn/ui; see `license.md`.
