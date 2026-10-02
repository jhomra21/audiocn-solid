# audiocn-solid

A Solid port of [audiocn/ui](https://github.com/audiocn/ui), targeting visual,
interaction, and API parity without a React runtime.

This repository is a work in progress. The first ported slice keeps audiocn's
framework-neutral audio types, dB math, zones, and frame sources, and ports the
`DbReadout` lifecycle to Solid.

## Goals

- Preserve audiocn's UI and interaction behavior instead of redesigning it.
- Keep performance-sensitive audio/frame code framework-neutral.
- Use Solid ownership and cleanup for component lifecycle.
- Keep source compatible with Solid 1 and Solid 2; compatibility is only claimed
  where the repository's acceptance lanes prove it.
- Use browser E2E tests for behavioral and visual acceptance.

## Development

```sh
bun install
bun run dev
```

Checks:

```sh
bun run check
bunx playwright install chromium
bun run test:e2e
```

The E2E run writes a repeatable screenshot to
`test-results/artifacts/db-readout.png`.

## Porting policy

The upstream implementation is the behavior reference. Framework-neutral audio
code stays framework-neutral. React lifecycle and state are translated to Solid
primitives only where the framework boundary actually exists.

See `AGENTS.md` for the repository engineering rules and reference codebases.

## License

MIT. Portions are adapted from audiocn/ui; see `license.md`.
