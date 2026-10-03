# audiocn-solid

A Solid port of [audiocn/ui](https://github.com/audiocn/ui). The target is the
same component behavior and styling without a React runtime.

The current foundation includes:

- the framework-neutral audio core used by meters and visualizers;
- `DbReadout`;
- `DbScale`;
- `ClipIndicator`;
- `LevelMeter` and its compound parts;
- Solid-native frame subscriptions, visibility tracking, reduced-motion
  handling, audio config context, and clip hold state.

The same component source is checked against Solid 1 and Solid 2. Both CI lanes
run browser acceptance tests and save screenshots.

## Development

Install and run the Solid 1 preview:

```sh
bun install
bun run dev
```

Run the normal checks and browser acceptance:

```sh
bun run check
bunx playwright install chromium
bun run test:e2e
```

The browser test exercises a live segmented level meter, RMS and peak bars,
peak hold, dB scale, dB readout, and clip indicator. Its screenshot is written
to `test-results/artifacts/level-meter.png`.

## Solid 2 acceptance

CI replaces the Solid 1 packages with the current Solid 2 prerelease and uses
Solid 2's compiler and web runtime:

```sh
bun add --no-save solid-js@next @solidjs/web@next @solidjs/vite-plugin@next
bunx tsc -p tsconfig.solid2.json --noEmit
bunx playwright install chromium
bun run test:e2e:solid2
```

The Solid 2 screenshot is written to
`test-results/solid2-artifacts/level-meter.png`.

Run `bun install` again afterward to restore the repository's Solid 1
development dependencies.

## Porting policy

The upstream implementation is the behavior reference. Framework-neutral audio
code stays framework-neutral. React lifecycle and state are translated only at
the framework boundary.

Solid 1 and Solid 2 have different effect and context-provider contracts. The
small compatibility helpers in `lib/solid-effect.ts` and
`lib/solid-context.ts` keep those differences out of component code.

See `AGENTS.md` for the engineering rules and reference codebases.

## License

MIT. Portions are adapted from audiocn/ui; see `license.md`.
